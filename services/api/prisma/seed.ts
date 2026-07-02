import { PrismaClient } from '@prisma/client';
import { SIGNUP_BONUS_NOTIONAL } from '@parity/shared';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@parity.local';

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'parityadmin',
        displayName: 'Parity Admin',
        oauthProvider: 'dev',
        oauthProviderId: 'admin-seed',
        role: 'ADMIN',
      },
    });
    await prisma.wallet.create({
      data: { userId: admin.id, balanceNotional: SIGNUP_BONUS_NOTIONAL },
    });
    await prisma.ledgerEntry.create({
      data: {
        userId: admin.id,
        type: 'SIGNUP_BONUS',
        amount: SIGNUP_BONUS_NOTIONAL,
        balanceAfter: SIGNUP_BONUS_NOTIONAL,
        referenceType: 'signup',
      },
    });
    console.log('Created admin user:', admin.email);
  }

  const demoCount = await prisma.market.count();
  if (demoCount === 0) {
    const opens = new Date();
    const closes = new Date(Date.now() + 7 * 86400000);
    await prisma.market.create({
      data: {
        slug: 'will-demo-market-resolve-yes',
        title: 'Will this demo market resolve YES?',
        description:
          'Resolution criteria: Admin resolves YES for demonstration purposes before close if still open.',
        category: 'Other',
        status: 'OPEN',
        opensAt: opens,
        closesAt: closes,
        createdById: admin.id,
      },
    });
    console.log('Created demo market');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
