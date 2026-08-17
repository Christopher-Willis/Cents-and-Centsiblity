import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { DocumentPickerAsset } from 'expo-document-picker';

export async function pickAndReadCsv(): Promise<{ name: string; content: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    base64: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const content = await readAssetText(asset);
  return { name: asset.name, content };
}

async function readAssetText(asset: DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    const webFile = asset.file;
    if (webFile) {
      return webFile.text();
    }
    throw new Error('No file object available on web.');
  }

  if (!asset.uri) {
    throw new Error('No file URI available.');
  }

  return FileSystem.readAsStringAsync(asset.uri);
}
