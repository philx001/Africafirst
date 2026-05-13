require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const prisma = new PrismaClient();
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const clients = await prisma.user.findMany({
      where: { role: 'client', isActive: true },
      select: { id: true, supabaseId: true, email: true, firstName: true, lastName: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const result = [];
    for (const client of clients) {
      const suffix = client.email.match(/(\d{4,})/)?.[1]?.slice(-6) || client.supabaseId.slice(0, 6);
      const password = `ClientDemo!${suffix}`;
      const { error } = await supabase.auth.admin.updateUserById(client.supabaseId, { password });
      if (error) {
        result.push({ email: client.email, ok: false, error: error.message });
        continue;
      }
      result.push({ email: client.email, password, ok: true });
    }

    console.log(JSON.stringify({ ok: true, updated: result }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
