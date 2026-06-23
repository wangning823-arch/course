'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClubState {
  currentClubId: string | null
  setCurrentClubId: (clubId: string | null) => void
  getCurrentClubId: () => string | null
}

export const useClubStore = create<ClubState>()(
  persist(
    (set, get) => ({
      currentClubId: null,

      setCurrentClubId: (clubId: string | null) => {
        set({ currentClubId: clubId })
      },

      getCurrentClubId: () => get().currentClubId,
    }),
    {
      name: 'club-storage',
      partialize: (state) => ({
        currentClubId: state.currentClubId,
      }),
    }
  )
)
