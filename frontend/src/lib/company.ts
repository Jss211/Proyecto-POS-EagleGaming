export const COMPANY_LOGO_URL = `${import.meta.env.BASE_URL}image.png`

export const DEMO_COMPANY = {
  tradeName: "EAGLE GAMING STORE",
  businessName: "EAGLE GAMING PERU E.I.R.L.",
  ruc: "20609482711",
  address: "1348.Jr Washington Cyber Plaza 1B-133, LIMA, PERU",
  phone: "",
  ticketFooter: "12 MESES POR DEFECTOS DE FABRICA.",
}

export type CompanyDetails = { [Field in keyof typeof DEMO_COMPANY]: string }
