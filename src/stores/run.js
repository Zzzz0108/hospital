import { defineStore } from 'pinia'

export const useRunStore = defineStore('run', {
  state: () => ({
    running: false,
  }),
  actions: {
    start(){ this.running = true },
  }
})


