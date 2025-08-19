
export interface ManagerState {
  version: string | null;
  isAlive: boolean;
}

export const managerState: ManagerState = {
  version: null,
  isAlive: false
};