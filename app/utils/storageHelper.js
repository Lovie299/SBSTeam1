// app/utils/storageHelper.js
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export async function checkFreeSpace() {
  const freeBytes = await FileSystem.getFreeDiskStorageAsync();
  const freeMB = freeBytes / (1024 * 1024);
  if (freeMB < 50) {
    Alert.alert('Low Storage', `Only ${Math.round(freeMB)}MB left. Please free up space.`);
    return false;
  }
  return true;
}