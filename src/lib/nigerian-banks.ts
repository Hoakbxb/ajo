export interface NigerianBank {
  code: string;
  name: string;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  { code: "120001", name: "9 Payment Service Bank" },
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "108", name: "Alpha Morgan Bank" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "103", name: "Globus Bank" },
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "030", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "303", name: "Lotus Bank" },
  { code: "50515", name: "Moniepoint Microfinance Bank" },
  { code: "100004", name: "Opay" },
  { code: "107", name: "Optimus Bank" },
  { code: "526", name: "Parallex Bank" },
  { code: "100033", name: "PalmPay" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "105", name: "Premium Trust Bank" },
  { code: "106", name: "Signature Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "102", name: "Titan Trust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
].sort((a, b) => a.name.localeCompare(b.name));

export function getBankByCode(code: string): NigerianBank | undefined {
  return NIGERIAN_BANKS.find((bank) => bank.code === code);
}

export function isValidAccountNumber(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber);
}
