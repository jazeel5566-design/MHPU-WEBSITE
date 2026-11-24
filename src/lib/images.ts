// Unsplash photos (free licence; hotlinked as Unsplash requires).
// Replace with MHPU's own photography as it becomes available.
const u = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMG = {
  heroTeam: u("photo-1755189118414-14c8dacdb082"),
  atollBaa: u("photo-1527401850656-0f34108fdb30"),
  islandAerial: u("photo-1537162998323-3d3675e0e87c"),
  stethoscope: u("photo-1584432810601-6c7f27d2362b", 1200),
  doctorPortrait: u("photo-1612349317150-e413f6a5b16d", 1200),
  doctorSmile: u("photo-1758691463582-11aea602cd4a", 1200),
  surgery: u("photo-1638598124048-10c5b3f2f964", 1200),
  labCoat: u("photo-1673865641073-4479f93a7776", 1200),
  nursesGroup: u("photo-1758575514487-0390fcacc339", 1200),
};

export const IMG_CREDITS = [
  ["Hoodh Ahmed", "https://unsplash.com/@zshmo"],
  ["Jailam Rashad", "https://unsplash.com/@jailam_r"],
  ["maks_d", "https://unsplash.com/@maks_d"],
  ["Usman Yousaf", "https://unsplash.com/@usmanyousaf"],
  ["Vitaly Gariev", "https://unsplash.com/@silverkblack"],
];
