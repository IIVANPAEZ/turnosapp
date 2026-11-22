import { E2E_EMAIL_LIKE, sql } from "./support";

/** Borra todo lo que crearon las pruebas (negocios y usuarios e2e+pw-…). */
export default async function globalTeardown() {
  const out = sql(
    `delete from public.businesses where id in (select bm.business_id from public.business_members bm join auth.users u on u.id = bm.user_id where u.email like '${E2E_EMAIL_LIKE}');
     delete from auth.users where email like '${E2E_EMAIL_LIKE}';
     select count(*) as quedan from auth.users where email like '${E2E_EMAIL_LIKE}';`,
  );
  const left = /"quedan":\s*(\d+)/.exec(out)?.[1];
  console.log(`\nLimpieza: quedan ${left ?? "?"} usuarios de prueba.`);
}
