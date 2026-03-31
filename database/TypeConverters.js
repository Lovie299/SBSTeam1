// database/TypeConverters.js
export class TypeConverters {
  // Convert Date to ISO string for storage
  static dateToString(date) {
    if (!date) return null;
    return date instanceof Date ? date.toISOString() : date;
  }

  // Convert ISO string to Date
  static stringToDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
  }

  // Convert boolean to integer (0/1)
  static booleanToInt(bool) {
    return bool ? 1 : 0;
  }

  // Convert integer to boolean
  static intToBoolean(int) {
    return int === 1;
  }

  // Convert object to JSON string
  static objectToJson(obj) {
    if (!obj) return null;
    return JSON.stringify(obj);
  }

  // Convert JSON string to object
  static jsonToObject(jsonString) {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
}