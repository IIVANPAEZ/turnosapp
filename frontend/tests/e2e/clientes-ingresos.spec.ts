import { expect, test } from "@playwright/test";
import { createBusiness, must, previousWeekday, signUp, sql, useSession } from "./support";

test("clientes: buscar sin tildes y ver la ficha con el cobro", async ({ page, context, baseURL }) => {
  const b = await createBusiness("clientes");
  const c = b.owner.client;
  const ana = must(await c.from("clients").insert({ business_id: b.businessId, full_name: "Ana Benítez", phone: "0981 111 222" }).select("id").single(), "ana");
  must(await c.from("clients").insert({ business_id: b.businessId, full_name: "Pedro Gómez", phone: "0982 333 444" }), "pedro");
  const id = must(
    await c.rpc("create_appointment", { p_member_id: b.memberId, p_client_id: ana.id, p_service_id: b.services.corte, p_date: previousWeekday(), p_time: "09:00" }),
    "turno",
  );
  must(await c.rpc("finish_appointment", { p_appointment_id: id, p_method: "cash", p_amount: 60000 }), "cobro");
  await useSession(context, b.owner, baseURL!);

  await page.goto("/dashboard/clientes");
  await page.getByLabel("Buscar cliente").fill("benitez");
  const rows = page.locator("ul.divide-y > li");
  await expect(rows).toHaveCount(1);
  await rows.first().click();
  const sheet = page.locator('[data-slot="sheet-content"]:visible');
  await expect(sheet.getByText("Ana Benítez").first()).toBeVisible();
  await expect(sheet.getByText("Cobrado ₲ 60.000 · Efectivo")).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Nuevo turno para Ana/ })).toBeVisible();
});

test("ingresos: el dueño ve el total de hoy; una profesional no ve los totales", async ({ page, context, baseURL }) => {
  const b = await createBusiness("ingresos");
  const c = b.owner.client;
  const ana = must(await c.from("clients").insert({ business_id: b.businessId, full_name: "Ana Benítez", phone: "0981 111 222" }).select("id").single(), "ana");
  const id = must(
    await c.rpc("create_appointment", { p_member_id: b.memberId, p_client_id: ana.id, p_service_id: b.services.barba, p_date: previousWeekday(), p_time: "10:00" }),
    "turno",
  );
  must(await c.rpc("finish_appointment", { p_appointment_id: id, p_method: "transfer", p_amount: 40000 }), "cobro");
  await useSession(context, b.owner, baseURL!);

  // El cobro se registró hoy → cuenta en "Hoy"
  await page.goto("/dashboard/ingresos?periodo=hoy");
  await expect(page.getByText("₲ 40.000").first()).toBeVisible();
  await expect(page.getByText("Transferencia o tarjeta").first()).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(/Hoy cobraste/)).toBeVisible();

  // Profesional (empleada)
  const staff = await signUp("staff", "Lucía Staff");
  sql(`insert into public.business_members (business_id, user_id, role, display_name) values ('${b.businessId}', '${staff.userId}', 'staff', 'Lucía');`);
  await useSession(context, staff, baseURL!);
  await page.goto("/dashboard/ingresos");
  await expect(page.getByText("Los ingresos los ve el dueño o un administrador")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(/Hoy cobraste/)).toHaveCount(0);
});
