import { NextRequest, NextResponse } from 'next/server';
import { db, getClient, ensureDbInitialized, isProduction } from '@/db';
import { applications, leaders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
  }

  const allowedStatuses = ['pending', 'approved', 'rejected'];
  const { status, adminNotes, leaderId } = body || {};

  if (status !== undefined && !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  if (adminNotes !== undefined && typeof adminNotes !== 'string') {
    return NextResponse.json(
      { error: 'adminNotes must be a string.' },
      { status: 400 }
    );
  }

  if (leaderId !== undefined && leaderId !== null) {
    if (typeof leaderId !== 'number' || leaderId < 1 || leaderId > 6) {
      return NextResponse.json(
        { error: 'leaderId must be a number between 1 and 6, or null to unassign.', code: 'INVALID_LEADER_ID' },
        { status: 400 }
      );
    }
  }

  try {
    await ensureDbInitialized();
    const client = getClient();
    const now = Date.now();

    // 1. Fetch current application record
    const appQuery = await client.execute({
      sql: 'SELECT * FROM applications WHERE id = ? LIMIT 1;',
      args: [id],
    });

    if (appQuery.rows.length === 0) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    const currentApp = appQuery.rows[0];
    const oldLeaderId = currentApp.leader_id ? Number(currentApp.leader_id) : null;
    let newLeaderId: number | null = oldLeaderId;
    let finalStatus = (status as string) || (currentApp.status as string);

    // 2. Handle Seat Assignment / Reassignment / Release
    if (leaderId !== undefined) {
      if (leaderId === null) {
        // Unassigning applicant
        if (oldLeaderId) {
          await client.execute({
            sql: `UPDATE leaders
                  SET name = NULL,
                      avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader' || position,
                      status = 'open',
                      updated_at = ?
                  WHERE id = ?;`,
            args: [now, oldLeaderId],
          });
        }
        newLeaderId = null;
        if (status === undefined) {
          finalStatus = 'pending';
        }
      } else {
        // Assigning or moving to slot `leaderId`
        const targetLeaderId = Number(leaderId);

        // Check if target slot is already filled by someone else
        const targetCheck = await client.execute({
          sql: 'SELECT * FROM leaders WHERE id = ? LIMIT 1;',
          args: [targetLeaderId],
        });

        if (targetCheck.rows.length === 0) {
          return NextResponse.json({ error: 'Leader slot does not exist.', code: 'SLOT_NOT_FOUND' }, { status: 400 });
        }

        const targetSlot = targetCheck.rows[0];

        // Concurrency-safe atomic claim:
        // Update slot if it is open OR if it's already held by this same application
        const claimRes = await client.execute({
          sql: `UPDATE leaders
                SET name = ?,
                    avatar = ?,
                    status = 'filled',
                    updated_at = ?
                WHERE id = ? AND (status = 'open' OR id = ?);`,
          args: [
            currentApp.name,
            currentApp.profile_image,
            now,
            targetLeaderId,
            oldLeaderId || 0,
          ],
        });

        if (claimRes.rowsAffected === 0) {
          return NextResponse.json(
            {
              error: `Slot #${targetSlot.position} (${targetSlot.role}) is already occupied by another applicant.`,
              code: 'SEAT_OCCUPIED',
            },
            { status: 409 }
          );
        }

        // If applicant was previously in a different slot, release that previous slot
        if (oldLeaderId && oldLeaderId !== targetLeaderId) {
          await client.execute({
            sql: `UPDATE leaders
                  SET name = NULL,
                      avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader' || position,
                      status = 'open',
                      updated_at = ?
                  WHERE id = ?;`,
            args: [now, oldLeaderId],
          });
        }

        newLeaderId = targetLeaderId;
        // Assigning a seat confirms/approves the application unless explicitly set
        if (status === undefined) {
          finalStatus = 'approved';
        }
      }
    } else {
      // leaderId was not provided, but status is changing
      if (status === 'rejected' || status === 'pending') {
        // If transitioning away from approved, release any held seat
        if (oldLeaderId) {
          await client.execute({
            sql: `UPDATE leaders
                  SET name = NULL,
                      avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader' || position,
                      status = 'open',
                      updated_at = ?
                  WHERE id = ?;`,
            args: [now, oldLeaderId],
          });
          newLeaderId = null;
        }
      } else if (status === 'approved' && !oldLeaderId) {
        // Approved applications must have an actual seat assignment under this workflow
        return NextResponse.json(
          {
            error: 'To approve this application, please use "Assign & Approve" to allocate an available seat.',
            code: 'ASSIGNMENT_REQUIRED',
          },
          { status: 400 }
        );
      }
    }

    // 3. Update application record
    const updatedNotes = adminNotes !== undefined ? adminNotes.slice(0, 1000) : currentApp.admin_notes;

    const updateRes = await client.execute({
      sql: `UPDATE applications
            SET status = ?,
                leader_id = ?,
                admin_notes = ?,
                updated_at = ?
            WHERE id = ?
            RETURNING *;`,
      args: [finalStatus, newLeaderId, updatedNotes, now, id],
    });

    const updatedApp = updateRes.rows[0];

    // Keep memoryStore synchronized for dev/fallback
    memoryStore.updateApplication(id, {
      status: finalStatus,
      adminNotes: updatedNotes,
      leaderId: newLeaderId,
    });

    return NextResponse.json(
      {
        success: true,
        application: updatedApp,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('PATCH application error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update application.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid application ID.' }, { status: 400 });
  }

  try {
    await ensureDbInitialized();
    const client = getClient();
    const now = Date.now();

    // Check which application and leader slot is affected
    const existingApps = await client.execute({
      sql: 'SELECT * FROM applications WHERE id = ? LIMIT 1;',
      args: [id],
    });

    if (existingApps.rows.length === 0) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    const app = existingApps.rows[0];
    const leaderId = app.leader_id ? Number(app.leader_id) : null;

    // Delete application
    await client.execute({
      sql: 'DELETE FROM applications WHERE id = ?;',
      args: [id],
    });

    // If associated with a leader, reset that slot back to open
    if (leaderId) {
      await client.execute({
        sql: `UPDATE leaders
              SET name = NULL,
                  avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader' || position,
                  status = 'open',
                  updated_at = ?
              WHERE id = ?;`,
        args: [now, leaderId],
      });
    }

    memoryStore.deleteApplication(id);

    return NextResponse.json({ success: true, id }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('DELETE application error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete application in persistent database.' },
      { status: 500 }
    );
  }
}
