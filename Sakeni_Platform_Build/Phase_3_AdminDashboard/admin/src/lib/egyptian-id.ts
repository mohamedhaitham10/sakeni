const GOVERNORATES: Record<string, string> = {
  "01": "Cairo",
  "02": "Alexandria",
  "03": "Port Said",
  "04": "Suez",
  "11": "Damietta",
  "12": "Dakahlia",
  "13": "Sharkia",
  "14": "Qalyubia",
  "15": "Kafr El Sheikh",
  "16": "Gharbia",
  "17": "Monufia",
  "18": "Beheira",
  "19": "Ismailia",
  "21": "Giza",
  "22": "Beni Suef",
  "23": "Faiyum",
  "24": "Minya",
  "25": "Asyut",
  "26": "Sohag",
  "27": "Qena",
  "28": "Aswan",
  "29": "Luxor",
  "31": "Red Sea",
  "32": "New Valley",
  "33": "Matrouh",
  "34": "North Sinai",
  "35": "South Sinai",
  "88": "Outside Egypt",
};

export interface ParsedID {
  isValid: boolean;
  birthdate?: string;
  governorate?: string;
  gender?: "Male" | "Female";
  error?: string;
}

export function parseEgyptianNationalID(id: string): ParsedID {
  if (!id) return { isValid: false };
  if (id.length !== 14) return { isValid: false, error: "Must be exactly 14 digits." };
  if (!/^\d+$/.test(id)) return { isValid: false, error: "Must contain only digits." };

  const centuryDigit = id[0];
  if (centuryDigit !== "2" && centuryDigit !== "3") {
    return { isValid: false, error: "First digit must be 2 (born 1900-1999) or 3 (born 2000-2099)." };
  }

  const century = centuryDigit === "2" ? "19" : "20";
  const yy = id.slice(1, 3);
  const mm = id.slice(3, 5);
  const dd = id.slice(5, 7);

  const year = parseInt(century + yy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  if (month < 1 || month > 12) return { isValid: false, error: "Invalid birth month." };

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return { isValid: false, error: "Invalid birth day." };

  const govCode = id.slice(7, 9);
  const governorate = GOVERNORATES[govCode];
  if (!governorate) return { isValid: false, error: "Invalid governorate code." };

  const genderDigit = parseInt(id[12], 10);
  const gender = genderDigit % 2 === 0 ? "Female" : "Male";

  return {
    isValid: true,
    birthdate: `${year}-${mm}-${dd}`,
    governorate,
    gender,
  };
}
