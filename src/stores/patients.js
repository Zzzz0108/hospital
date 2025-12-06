import { defineStore } from 'pinia'

const API_BASE = 'http://localhost:3001/api'

export const usePatientsStore = defineStore('patients', {
  state: () => ({
    all: [],
    filtered: [],
    selectedId: null,
    loading: false,
    lastSearchQuery: null, // 保存最后一次搜索条件
  }),
  actions: {
    async loadAll(){
      this.loading = true
      try{
        const res = await fetch(`${API_BASE}/patients`)
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '加载失败')
        // 后端返回的数据字段：id, name, gender, birthday
        // 按ID排序（数字ID按数字排序，字符串ID按字符串排序）
        this.all = (data.data || []).sort((a, b) => {
          // 尝试将ID转换为数字进行比较，如果都是数字则按数字排序，否则按字符串排序
          const aNum = Number(a.id)
          const bNum = Number(b.id)
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum
          }
          return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
        })
        this.lastSearchQuery = null // 清空搜索条件
        this.filtered = this.all // 直接显示全部，不分页
      } catch (e){
        console.error('loadAll patients error', e)
        alert('加载患者列表失败，请检查后端服务')
      } finally {
        this.loading = false
      }
    },
    async add(p){
      try{
        const res = await fetch(`${API_BASE}/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: p.id || undefined,
            name: p.name,
            gender: p.gender,
            birthday: p.birthday,
          })
        })
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '新增失败')
        const id = data.data.id
        const rec = { id, name:p.name, gender:p.gender, birthday:p.birthday }
      this.all.push(rec)
        // 重新排序
        this.all.sort((a, b) => {
          const aNum = Number(a.id)
          const bNum = Number(b.id)
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum
          }
          return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
        })
        
        // 如果有搜索条件，重新应用搜索；否则直接显示全部
        if(this.lastSearchQuery){
          this.search(this.lastSearchQuery)
        } else {
          this.filtered = this.all
        }
      this.selectedId = id
      } catch (e){
        console.error('add patient error', e)
        alert('新增患者失败，请检查后端服务')
      }
    },
    select(id){ this.selectedId = id },
    clearSelection(){ this.selectedId = null },
    async updateSelected(p){
      if(!this.selectedId) return
      const oldId = this.selectedId
      try{
        const res = await fetch(`${API_BASE}/patients/${oldId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: p.id || oldId, // 如果用户修改了 ID，传新 ID；否则传旧 ID
            name: p.name,
            gender: p.gender,
            birthday: p.birthday,
          })
        })
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '更新失败')
        
        const newId = data.data.id // 后端返回的最终 ID（可能是新的，也可能是旧的）
        
        // 如果 ID 变了，需要从 all 中删除旧记录，添加新记录
        if(newId !== oldId){
          this.all = this.all.filter(x => x.id !== oldId)
          const newRec = { id: newId, name: p.name, gender: p.gender, birthday: p.birthday }
          this.all.push(newRec)
          // 重新排序
          this.all.sort((a, b) => {
            const aNum = Number(a.id)
            const bNum = Number(b.id)
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum
            }
            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
          })
          this.selectedId = newId // 更新选中 ID
        } else {
          // ID 没变，直接更新 all 数组中的数据
          const i = this.all.findIndex(x=>x.id===oldId)
          if(i>-1){
            this.all[i] = { ...this.all[i], ...p, id: oldId }
          }
        }
        
        // 如果有搜索条件，重新应用搜索；否则直接显示全部
        if(this.lastSearchQuery){
          this.search(this.lastSearchQuery)
        } else {
          this.filtered = this.all
        }
      } catch (e){
        console.error('update patient error', e)
        alert('更新患者失败：' + (e.message || '请检查后端服务'))
      }
    },
    async removeSelected(){
      if(!this.selectedId) return
      const id = this.selectedId
      try{
        const res = await fetch(`${API_BASE}/patients/${id}`, { method: 'DELETE' })
        const data = await res.json()
        if(!data.ok) throw new Error(data.message || '删除失败')
        this.all = this.all.filter(x=>x.id!==id)
        
        // 如果有搜索条件，重新应用搜索；否则直接显示全部
        if(this.lastSearchQuery){
          this.search(this.lastSearchQuery)
        } else {
          this.filtered = this.all
        }
      this.selectedId = null
      } catch (e){
        console.error('remove patient error', e)
        alert('删除患者失败，请检查后端服务')
      }
    },
    search(q){
      // 保存搜索条件
      this.lastSearchQuery = q
      const s = (v) => (v||'').toLowerCase()
      const rows = this.all.filter(x =>
        (!q.name || s(x.name).includes(s(q.name))) &&
        (!q.gender || s(x.gender).includes(s(q.gender))) &&
        (!q.birthday || s(x.birthday).includes(s(q.birthday))) &&
        (!q.id || s(x.id).includes(s(q.id)))
      )
      // 搜索结果也按ID排序
      rows.sort((a, b) => {
        const aNum = Number(a.id)
        const bNum = Number(b.id)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
      })
      this.filtered = rows // 直接显示搜索结果，不分页
    },
  }
})

