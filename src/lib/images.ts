/** MHPU's own photos (from the old website), served from /public/photos.
 *  Admins can replace the page banners in Admin → Site photos. */
export const PHOTO = {
  march: "/photos/march.jpg",
  mayDayGathering: "/photos/may-day-2023-gathering.jpg",
  team: "/photos/team.jpg",
  workLifeBalance: "/photos/may-day-2023-2.jpg",
  decentWork: "/photos/may-day-2023-3.jpg",
  wageTheft: "/photos/wage-theft-placard.jpg",
  oshTraining: "/photos/osh-training.jpg",
  maternityPolicy: "/photos/maternity-policy-campaign.jpg",
  unionStall: "/photos/union-stall.jpg",
};

/** Photos used when an article has no cover of its own: picked by the article's address,
 *  so each article keeps the same photo and neighbouring cards differ. */
const COVER_POOL = [
  PHOTO.workLifeBalance, PHOTO.decentWork, PHOTO.mayDayGathering, PHOTO.march, PHOTO.wageTheft,
  PHOTO.unionStall, PHOTO.team, PHOTO.oshTraining, PHOTO.maternityPolicy,
];
export function coverFor(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COVER_POOL[h % COVER_POOL.length];
}
