require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!org) throw new Error('Aucune organisation trouvée');

    const ts = Date.now();
    const suffix = String(ts).slice(-6);
    const email = `client.demo.${ts}@africafirst.local`;
    const password = `ClientDemo!${suffix}`;

    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        firstName: 'Client',
        lastName: `Demo${String(ts).slice(-4)}`,
        email,
        phone: '+33123456789',
        country: 'France',
        jobTitle: 'client',
        department: 'Conseil IA',
      },
    });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        organization_id: org.id,
        user_role: 'client',
        contact_id: contact.id,
      },
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Création user Supabase impossible');
    }

    await prisma.user.create({
      data: {
        supabaseId: data.user.id,
        organizationId: org.id,
        email,
        role: 'client',
        contactId: contact.id,
        firstName: 'Client',
        lastName: 'Demo',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: 'Projet Démo Portail Client',
        status: 'in_progress',
        progress: 30,
        contactId: contact.id,
        description: 'Projet de test pour visualisation portail client',
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          email,
          password,
          organizationId: org.id,
          contactId: contact.id,
          projectId: project.id,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
