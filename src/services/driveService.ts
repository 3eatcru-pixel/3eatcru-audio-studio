/**
 * Service to interact with the user's personal Google Drive.
 * Part of the "Zero-Cost Architecture".
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

export const saveProjectToDrive = async (projectId: string, projectName: string, projectData: any) => {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('Not authenticated with Google Drive');

  const metadata = {
    name: `${projectName}.aura`,
    mimeType: 'application/json',
    appProperties: {
      projectId: projectId,
      app: 'AURA'
    }
  };

  // Recomendação: Para arquivos de áudio grandes, use uploadType=resumable
  // O código atual é ideal para o arquivo de definição do projeto (.aura)
  const file = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  try {
    const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });

    if (!response.ok) throw new Error('Failed to save to Drive');
    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error('Drive Save Error:', error);
    throw error;
  }
};

/**
 * Uploads a raw audio blob to Google Drive.
 * Used for saving recorded tracks or imported samples.
 */
export const uploadAudioToDrive = async (blob: Blob, fileName: string, trackId: string) => {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('Not authenticated with Google Drive');

  const metadata = {
    name: `${fileName}.wav`,
    mimeType: 'audio/wav',
    appProperties: {
      trackId: trackId,
      app: 'AURA'
    }
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  try {
    const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,webViewLink`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });

    if (!response.ok) throw new Error('Failed to upload audio to Drive');
    return await response.json(); // Retorna o ID e o link do arquivo
  } catch (error) {
    console.error('Drive Audio Upload Error:', error);
    throw error;
  }
};

export const updateProjectInDrive = async (fileId: string, projectData: any) => {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('Not authenticated with Google Drive');

  try {
    const response = await fetch(`${UPLOAD_API_BASE}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) throw new Error('Failed to update Drive file');
    return await response.json();
  } catch (error) {
    console.error('Drive Update Error:', error);
    throw error;
  }
};

export const getProjectFromDrive = async (fileId: string) => {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('Not authenticated with Google Drive');

  try {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch from Drive');
    return await response.json();
  } catch (error) {
    console.error('Drive Fetch Error:', error);
    throw error;
  }
};
