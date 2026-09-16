export const PLACEHOLDERS = {
  boat: 'название яхты',
  callsign: 'позывной',
  mmsi: 'MMSI',
  persons: 'число людей',
  position: 'координаты',
  nature: 'что случилось',
  help: 'какая помощь нужна',
};

export function callValues(settings) {
  return {
    boat: settings.boatName ?? '',
    callsign: settings.callsign ?? '',
    mmsi: settings.mmsi ?? '',
    persons: settings.persons ?? '',
  };
}

export function fillTemplate(line, values) {
  return line.replace(/\{(\w+)\}/g, (_, key) => values[key] || `‹${PLACEHOLDERS[key] ?? key}›`);
}
