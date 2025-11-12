// Service API Mock pour démo sans backend
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', type: 'humoriste' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', type: 'organisateur' }
];

const mockEvents = [
  { 
    id: '1', 
    title: 'Soirée Comedy Club', 
    date: '2024-02-15', 
    location: 'Paris', 
    status: 'open',
    organizer: 'Jane Smith'
  }
];

class MockAPI {
  // Auth
  async login(_credentials: any) {
    await delay(1000);
    return {
      token: 'mock-jwt-token',
      user: mockUsers[0]
    };
  }

  async register(_userData: any) {
    await delay(1000);
    return {
      token: 'mock-jwt-token',
      user: { ..._userData, id: Date.now().toString() }
    };
  }

  // Events
  async getEvents() {
    await delay(500);
    return mockEvents;
  }

  async createEvent(_eventData: any) {
    await delay(1000);
    return { ..._eventData, id: Date.now().toString() };
  }

  // Profile
  async getProfile() {
    await delay(500);
    return mockUsers[0];
  }

  async updateProfile(_profileData: any) {
    await delay(1000);
    return { ...mockUsers[0], ..._profileData };
  }

  // Applications
  async getApplications() {
    await delay(500);
    return [];
  }

  async applyToEvent(_eventId: string) {
    await delay(1000);
    return { success: true, message: 'Candidature envoyée' };
  }

  // Catch-all pour autres endpoints
  async request(_config: any) {
    await delay(500);
    console.warn('Mock API: Endpoint non implémenté:', _config.url);
    return { data: {} };
  }
}

const mockApi = new MockAPI();

// Export compatibilité avec l'API existante
export default {
  get: (url: string) => mockApi.request({ method: 'GET', url }),
  post: (url: string, data?: any) => mockApi.request({ method: 'POST', url, data }),
  put: (url: string, data?: any) => mockApi.request({ method: 'PUT', url, data }),
  delete: (url: string) => mockApi.request({ method: 'DELETE', url }),
  
  // Méthodes spécifiques
  login: mockApi.login.bind(mockApi),
  register: mockApi.register.bind(mockApi),
  getEvents: mockApi.getEvents.bind(mockApi),
  createEvent: mockApi.createEvent.bind(mockApi),
  getProfile: mockApi.getProfile.bind(mockApi),
  updateProfile: mockApi.updateProfile.bind(mockApi),
  getApplications: mockApi.getApplications.bind(mockApi),
  applyToEvent: mockApi.applyToEvent.bind(mockApi)
};

export const markAbsence = async () => ({ success: true });
export const cancelAbsence = async () => ({ success: true });
export const getEventAbsences = async () => ([]);
export const getComedianAbsences = async () => ([]); 