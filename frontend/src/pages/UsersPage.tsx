import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { adminApi, AdminUser } from '../api/compliance'
import { useAuthStore } from '../store/authStore'

const roleColors: Record<string, 'blue' | 'green' | 'yellow' | 'purple'> = {
  admin: 'blue', analyst: 'green', auditor: 'yellow', viewer: 'purple',
}

export function UsersPage() {
  const { hasPermission } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role_name: 'analyst' })

  // Edit role state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editRole, setEditRole] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    adminApi.listUsers({ page: 1, page_size: 50 })
      .then(data => { setUsers(data.items); setTotal(data.total) })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      await adminApi.createUser(newUser)
      setShowCreate(false)
      setNewUser({ email: '', password: '', role_name: 'analyst' })
      fetchUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditRole = (user: AdminUser) => {
    setEditingUser(user)
    setEditRole(user.role_name)
    setError(null)
  }

  const handleUpdateRole = async () => {
    if (!editingUser) return
    setUpdating(true)
    setError(null)
    try {
      await adminApi.updateRole(editingUser.id, editRole)
      setEditingUser(null)
      fetchUsers()
    } catch (err: any) {
      setError(err?.response?.data?.detail?.message ?? 'Failed to update role.')
    } finally {
      setUpdating(false)
    }
  }

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">{total} users in this tenant</p>
        </div>
        {hasPermission('admin:users') && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Invite User
          </button>
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      {showCreate && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Create New User</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="input" value={newUser.email} onChange={e => setNewUser(n => ({ ...n, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input type="password" className="input" value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select className="input" value={newUser.role_name} onChange={e => setNewUser(n => ({ ...n, role_name: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="auditor">Auditor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newUser.email || !newUser.password}>
              {creating ? <Spinner size="sm" /> : 'Create User'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="search" placeholder="Search users…" className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['User', 'Role', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-400 font-mono">{u.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={roleColors[u.role_name] ?? 'gray'} className="capitalize">{u.role_name}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {hasPermission('admin:users') ? (
                      <button
                        onClick={() => handleEditRole(u)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Edit Role
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No users found.</div>
        )}
      </div>
      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="font-semibold text-gray-900">Change Role</h3>
            <p className="text-sm text-gray-600">
              Updating role for <span className="font-medium">{editingUser.email}</span>
            </p>
            {error && <Alert variant="error" message={error} />}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Role</label>
              <select
                className="input"
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="auditor">Auditor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={handleUpdateRole}
                disabled={updating || editRole === editingUser.role_name}
              >
                {updating ? <Spinner size="sm" /> : 'Save Change'}
              </button>
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
