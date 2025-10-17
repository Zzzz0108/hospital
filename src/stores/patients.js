import { defineStore } from 'pinia'

export const usePatientsStore = defineStore('patients', {
  state: () => ({
    all: [],
    filtered: [],
    selectedId: null,
    page: 1,
    pageSize: 8,
  }),
  getters: {
    totalPages(state){
      return Math.max(1, Math.ceil(state.all.length / state.pageSize))
    },
  },
  actions: {
    add(p){
      const id = p.id || String(Date.now())
      const rec = { name:p.name, gender:p.gender, birthday:p.birthday, id }
      this.all.push(rec)
      this.filtered = this.paginate(this.all)
      this.selectedId = id
    },
    select(id){ this.selectedId = id },
    clearSelection(){ this.selectedId = null },
    updateSelected(p){
      if(!this.selectedId) return
      const i = this.all.findIndex(x=>x.id===this.selectedId)
      if(i>-1){ this.all[i] = { ...this.all[i], ...p, id:this.selectedId } }
      this.filtered = this.paginate(this.all)
    },
    removeSelected(){
      if(!this.selectedId) return
      this.all = this.all.filter(x=>x.id!==this.selectedId)
      this.filtered = this.paginate(this.all)
      this.selectedId = null
    },
    search(q){
      const s = (v) => (v||'').toLowerCase()
      const rows = this.all.filter(x =>
        (!q.name || s(x.name).includes(s(q.name))) &&
        (!q.gender || s(x.gender).includes(s(q.gender))) &&
        (!q.birthday || s(x.birthday).includes(s(q.birthday))) &&
        (!q.id || s(x.id).includes(s(q.id)))
      )
      this.page = 1
      this.filtered = this.paginate(rows)
    },
    paginate(rows){
      const start = (this.page-1)*this.pageSize
      return rows.slice(start, start+this.pageSize)
    },
    prevPage(){ if(this.page>1){ this.page--; this.filtered = this.paginate(this.all) } },
    nextPage(){ if(this.page<this.totalPages){ this.page++; this.filtered = this.paginate(this.all) } },
  }
})


