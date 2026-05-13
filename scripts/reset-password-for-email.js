/**
 * Définit le mot de passe Supabase Auth pour un utilisateur déjà connu en base Prisma.
 *
 * Prérequis : apps/api/.env avec SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *
 * Usage (depuis la racine du repo) :
 *   node scripts/reset-password-for-email.js admin.demo.05090400@africafirst.local "MonMotDePasse!123"
 */
require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'Usage: node scripts/reset-password-for-email.js <email> <nouveau_mot_de_passe>',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.trim() },
      select: { id: true, supabaseId: true, email: true, role: true },
    });
    if (!user) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: `Aucun utilisateur Prisma avec l'email "${email}". Créez un compte via /register ou vérifiez la base.`,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.auth.admin.updateUserById(user.supabaseId, { password });
    if (error) {
      console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
      process.exit(1);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email: user.email,
          role: user.role,
          message: 'Mot de passe mis à jour dans Supabase Auth. Vous pouvez vous connecter.',
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
