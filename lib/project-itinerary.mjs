export const itineraryBucket = 'trip-itineraries';
export const maxItineraryBytes = 25 * 1024 * 1024;
const types = {
  html: 'text/html',
  htm: 'text/html',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export function itineraryFileType(name) {
  const extension = /\.([a-z]+)$/i.exec(String(name || ''))?.[1].toLowerCase();
  return Object.hasOwn(types, extension) ? types[extension] : null;
}

export function itineraryPrefix(householdId, projectId) {
  return householdId + '/' + Buffer.from(String(projectId)).toString('base64url') + '/';
}

export function itineraryObjectIsValid(path, householdId, projectId) {
  const prefix = itineraryPrefix(householdId, projectId);
  return typeof path === 'string' && path.startsWith(prefix) &&
    /^[a-f\d-]{36}\.[a-z]+$/.test(path.slice(prefix.length)) && Boolean(itineraryFileType(path));
}
