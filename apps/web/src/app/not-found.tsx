import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-lg font-semibold">Page introuvable</h2>
      <p className="text-center text-sm text-muted-foreground">
        Cette URL ne correspond à aucune page de l&apos;application.
      </p>
      <Link href="/login" className="text-sm font-medium text-primary underline underline-offset-4">
        Retour à la connexion
      </Link>
    </div>
  );
}
