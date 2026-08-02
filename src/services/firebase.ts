// Firebase Firestore cloud storage disabled by request - using Supabase only.
export const isFirebaseConfigured = false;
export async function firebaseSaveUsers(): Promise<boolean> { return false; }
export async function firebaseDeleteUser(): Promise<boolean> { return false; }
export async function firebaseFetchUsers(): Promise<null> { return null; }
export async function firebaseSaveLogs(): Promise<boolean> { return false; }
export async function firebaseFetchLogs(): Promise<null> { return null; }
export async function firebaseSaveSchoolConfig(): Promise<boolean> { return false; }
export async function firebaseFetchSchoolConfig(): Promise<null> { return null; }
export async function firebaseSaveBKNotes(): Promise<boolean> { return false; }
export async function firebaseFetchBKNotes(): Promise<null> { return null; }
export async function firebaseSaveCustomPassword(): Promise<boolean> { return false; }
export async function firebaseFetchCustomPasswords(): Promise<null> { return null; }
export function subscribeToFirebaseRealtime(): () => void { return () => {}; }


