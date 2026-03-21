// Fetches 34 Vietnamese provinces from open-api.vn v2 (post-2025 administrative reform)
// with a static fallback

export interface ProvinceGrouped {
  cities: string[];    // Thành phố trực thuộc trung ương
  provinces: string[]; // Tỉnh
}

const STATIC_GROUPED: ProvinceGrouped = {
  cities: [
    "Thành phố Hà Nội",
    "Thành phố Hải Phòng",
    "Thành phố Huế",
    "Thành phố Đà Nẵng",
    "Thành phố Hồ Chí Minh",
    "Thành phố Cần Thơ",
  ],
  provinces: [
    "Tỉnh Cao Bằng", "Tỉnh Tuyên Quang", "Tỉnh Điện Biên", "Tỉnh Lai Châu",
    "Tỉnh Sơn La", "Tỉnh Lào Cai", "Tỉnh Thái Nguyên", "Tỉnh Lạng Sơn",
    "Tỉnh Quảng Ninh", "Tỉnh Bắc Ninh", "Tỉnh Phú Thọ", "Tỉnh Hưng Yên",
    "Tỉnh Ninh Bình", "Tỉnh Thanh Hóa", "Tỉnh Nghệ An", "Tỉnh Hà Tĩnh",
    "Tỉnh Quảng Trị", "Tỉnh Quảng Ngãi", "Tỉnh Gia Lai", "Tỉnh Khánh Hòa",
    "Tỉnh Đắk Lắk", "Tỉnh Lâm Đồng", "Tỉnh Đồng Nai", "Tỉnh Tây Ninh",
    "Tỉnh Đồng Tháp", "Tỉnh Vĩnh Long", "Tỉnh An Giang", "Tỉnh Cà Mau",
  ],
};

/** Returns all province names as a flat list (cities first, then provinces). */
export async function fetchProvinces(): Promise<string[]> {
  const grouped = await fetchProvincesGrouped();
  return [...grouped.cities, ...grouped.provinces];
}

/** Returns provinces split into cities (Thành phố) and provinces (Tỉnh). */
export async function fetchProvincesGrouped(): Promise<ProvinceGrouped> {
  try {
    const res = await fetch("https://provinces.open-api.vn/api/v2/p/");
    if (!res.ok) return STATIC_GROUPED;
    const data: Array<{ name: string; division_type: string }> = await res.json();
    const cities = data.filter((p) => p.division_type === "thành phố trung ương").map((p) => p.name);
    const provinces = data.filter((p) => p.division_type !== "thành phố trung ương").map((p) => p.name);
    return { cities, provinces };
  } catch {
    return STATIC_GROUPED;
  }
}
