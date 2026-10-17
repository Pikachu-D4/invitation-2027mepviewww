import { db } from '@/db';
import { leaders } from '@/db/schema';

async function main() {
    const sampleLeaders = [
        {
            name: null,
            role: 'Leader',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader1',
            status: 'open',
            position: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: null,
            role: 'Leader',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader2',
            status: 'open',
            position: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: null,
            role: 'Leader',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader3',
            status: 'open',
            position: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: null,
            role: 'Co-Leader',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader4',
            status: 'open',
            position: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: null,
            role: 'Co-Leader',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader5',
            status: 'open',
            position: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: null,
            role: 'Co-Leader',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader6',
            status: 'open',
            position: 6,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    await db.insert(leaders).values(sampleLeaders);
    
    console.log('✅ Leaders seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});