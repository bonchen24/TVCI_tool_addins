export interface UserDraftingProfile {
  id: string;
  fullName: string;
  jobTitle: string;
  organization: "TVCI" | "IEMM" | "DANG";
  department: string;
  defaultLocation: string;
  commonSigners: Array<{ title: string; name: string }>;
  commonRecipients: string[];
  defaultSymbolPrefix: string;
  isDefault: boolean;
}

const PROFILES_STORAGE_KEY = 'tvci_drafting_profiles';

export interface IProfileRepository {
  getProfiles(): UserDraftingProfile[];
  getActiveProfile(): UserDraftingProfile | null;
  saveProfile(profile: UserDraftingProfile): void;
  deleteProfile(id: string): void;
}

export class LocalProfileRepository implements IProfileRepository {
  getProfiles(): UserDraftingProfile[] {
    try {
      const data = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore
    }
    return [];
  }

  getActiveProfile(): UserDraftingProfile | null {
    const profiles = this.getProfiles();
    return profiles.find(p => p.isDefault) || profiles[0] || null;
  }

  saveProfile(profile: UserDraftingProfile): void {
    const profiles = this.getProfiles();
    if (profile.isDefault) {
      profiles.forEach(p => p.isDefault = false);
    }
    
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    
    if (profiles.length === 1) {
      profiles[0].isDefault = true;
    }
    
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      console.error('Failed to save profiles to local storage');
    }
  }

  deleteProfile(id: string): void {
    let profiles = this.getProfiles();
    profiles = profiles.filter(p => p.id !== id);
    if (profiles.length > 0 && !profiles.some(p => p.isDefault)) {
      profiles[0].isDefault = true;
    }
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      console.error('Failed to save profiles to local storage');
    }
  }
}

export const profileStorage = new LocalProfileRepository();
