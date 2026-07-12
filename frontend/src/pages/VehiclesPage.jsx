import { useState, useEffect } from 'react'
import { Plus, X, Edit, Trash2, FileText, Search, ArrowUpDown, ArrowUp, ArrowDown, Upload } from 'lucide-react'
import StatusBadge from '../components/layout/StatusBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDocuments,
  uploadVehicleDocument,
  deleteVehicleDocument
} from '../lib/api.js'

export default function VehiclesPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'fleet_manager'
  const { formatDistance, formatCurrency, distanceUnitLabel, currencySymbol } = useSettings()

  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('registration_number')
  const [sortDirection, setSortDirection] = useState('asc')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [regNum, setRegNum] = useState('')
  const [model, setModel] = useState('')
  const [type, setType] = useState('Van')
  const [maxLoad, setMaxLoad] = useState('')
  const [odometer, setOdometer] = useState('0')
  const [acqCost, setAcqCost] = useState('')
  const [status, setStatus] = useState('Available')
  const [region, setRegion] = useState('')

  // Documents Modal states
  const [isDocsOpen, setIsDocsOpen] = useState(false)
  const [docVehicle, setDocVehicle] = useState(null)
  const [docsList, setDocsList] = useState([])
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('Insurance')
  const [docFile, setDocFile] = useState('')
  const [docError, setDocError] = useState('')
  const [docSubmitting, setDocSubmitting] = useState(false)

  async function loadVehicles() {
    try {
      setIsLoading(true)
      const data = await getVehicles()
      setVehicles(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load vehicles.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  // Open register modal
  const handleOpenAdd = () => {
    setEditingVehicle(null)
    setRegNum('')
    setModel('')
    setType('Van')
    setMaxLoad('')
    setOdometer('0')
    setAcqCost('')
    setStatus('Available')
    setRegion('')
    setFormError('')
    setIsModalOpen(true)
  }

  // Open edit modal
  const handleOpenEdit = (v) => {
    setEditingVehicle(v)
    setRegNum(v.registration_number)
    setModel(v.model)
    setType(v.type)
    setMaxLoad(v.max_load_capacity.toString())
    
    const odoVal = distanceUnitLabel === 'mi' ? Math.round(v.odometer * 0.621371) : v.odometer
    setOdometer(odoVal.toString())
    
    let costVal = v.acquisition_cost
    if (currencySymbol === '$') costVal = Math.round(v.acquisition_cost / 80)
    else if (currencySymbol === '€') costVal = Math.round(v.acquisition_cost / 90)
    else if (currencySymbol === '£') costVal = Math.round(v.acquisition_cost / 100)
    setAcqCost(costVal.toString())
    
    setStatus(v.status)
    setRegion(v.region || '')
    setFormError('')
    setIsModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (id, reg) => {
    if (!confirm(`Are you sure you want to delete vehicle ${reg}?`)) return
    try {
      await deleteVehicle(id)
      loadVehicles()
    } catch (err) {
      alert(err.message || 'Failed to delete vehicle.')
    }
  }

  // Handle Form Submit (Create or Update)
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    if (!regNum.trim()) return setFormError('Registration number is required.')
    if (!model.trim()) return setFormError('Model/Name is required.')
    if (parseFloat(maxLoad) <= 0 || isNaN(parseFloat(maxLoad))) {
      setIsSubmitting(false)
      return setFormError('Maximum load capacity must be greater than 0.')
    }
    if (parseFloat(odometer) < 0 || isNaN(parseFloat(odometer))) {
      setIsSubmitting(false)
      return setFormError('Odometer must be 0 or greater.')
    }
    if (parseFloat(acqCost) <= 0 || isNaN(parseFloat(acqCost))) {
      setIsSubmitting(false)
      return setFormError('Acquisition cost must be greater than 0.')
    }

    try {
      const finalOdometer = distanceUnitLabel === 'mi' ? Math.round(parseFloat(odometer) / 0.621371) : parseFloat(odometer)
      
      let finalAcqCost = parseFloat(acqCost)
      if (currencySymbol === '$') finalAcqCost = finalAcqCost * 80
      else if (currencySymbol === '€') finalAcqCost = finalAcqCost * 90
      else if (currencySymbol === '£') finalAcqCost = finalAcqCost * 100

      const payload = {
        registration_number: regNum.trim(),
        model: model.trim(),
        type,
        max_load_capacity: parseFloat(maxLoad),
        odometer: finalOdometer,
        acquisition_cost: finalAcqCost,
        status,
        region: region.trim() || null,
      }

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload)
      } else {
        await createVehicle(payload)
      }

      setIsModalOpen(false)
      loadVehicles()
    } catch (err) {
      setFormError(err.message || 'Failed to save vehicle details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Document Management Handlers
  const handleOpenDocs = async (v) => {
    setDocVehicle(v)
    setDocName('')
    setDocType('Insurance')
    setDocFile('')
    setDocError('')
    setIsDocsOpen(true)
    await loadVehicleDocs(v.id)
  }

  const loadVehicleDocs = async (vId) => {
    try {
      const docs = await getVehicleDocuments(vId)
      setDocsList(docs || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setDocFile(reader.result)
      if (!docName) {
        setDocName(file.name.split('.')[0])
      }
    }
    reader.readAsDataURL(file)
  }

  const handleUploadDoc = async (e) => {
    e.preventDefault()
    setDocError('')
    if (!docName.trim()) return setDocError('Document name is required.')
    if (!docFile) return setDocError('Please select a file.')

    setDocSubmitting(true)
    try {
      await uploadVehicleDocument(docVehicle.id, {
        name: docName.trim(),
        document_type: docType,
        upload_date: new Date().toISOString().split('T')[0],
        file_content: docFile,
      })
      setDocName('')
      setDocFile('')
      const fileInput = document.getElementById('docFileField')
      if (fileInput) fileInput.value = ''
      await loadVehicleDocs(docVehicle.id)
    } catch (err) {
      setDocError(err.message || 'Failed to upload document.')
    } finally {
      setDocSubmitting(false)
    }
  }

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await deleteVehicleDocument(docId)
      await loadVehicleDocs(docVehicle.id)
    } catch (err) {
      alert(err.message || 'Failed to delete document.')
    }
  }

  // Sort & Search execution
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 text-ink-muted" />
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="inline ml-1 text-accent" />
      : <ArrowDown size={12} className="inline ml-1 text-accent" />
  }

  const filteredVehicles = vehicles.filter((v) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = (
      v.registration_number.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      (v.region && v.region.toLowerCase().includes(term))
    )
    const matchesType = filterType === 'All' || v.type === filterType
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    let valA = a[sortField]
    let valB = b[sortField]

    if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = valB.toLowerCase()
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by reg number, model, or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-stamp border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-stamp border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
          >
            <option value="All">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Mini">Mini</option>
            <option value="SUV">SUV</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-stamp border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>

          {(filterType !== 'All' || filterStatus !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setFilterType('All')
                setFilterStatus('All')
              }}
              className="rounded-stamp border border-border bg-paper px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 self-end">
          <p className="text-xs text-ink-muted hidden md:block">
            {sortedVehicles.length} vehicles found
          </p>
          {isManager && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-stamp bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 font-semibold"
            >
              <Plus size={14} /> Register vehicle
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-ink-muted animate-pulse">Loading vehicles...</p>
        </div>
      ) : error ? (
        <div className="rounded-stamp border border-danger bg-surface p-4 text-danger text-sm">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-stamp border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-muted select-none">
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('registration_number')}>
                  Registration No. {renderSortIcon('registration_number')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('model')}>
                  Name / Model {renderSortIcon('model')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('type')}>
                  Type {renderSortIcon('type')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('max_load_capacity')}>
                  Max Load {renderSortIcon('max_load_capacity')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('region')}>
                  Region {renderSortIcon('region')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('odometer')}>
                  Odometer ({distanceUnitLabel}) {renderSortIcon('odometer')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('acquisition_cost')}>
                  Acq Cost ({currencySymbol}) {renderSortIcon('acquisition_cost')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-ink" onClick={() => toggleSort('status')}>
                  Status {renderSortIcon('status')}
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedVehicles.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-ink-muted text-sm">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                sortedVehicles.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3 font-mono text-xs text-ink font-semibold">{v.registration_number}</td>
                    <td className="px-4 py-3 text-ink font-medium">{v.model}</td>
                    <td className="px-4 py-3 text-ink-muted">{v.type}</td>
                    <td className="px-4 py-3 text-ink-muted">{v.max_load_capacity} kg</td>
                    <td className="px-4 py-3 text-ink-muted">{v.region || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {formatDistance(v.odometer)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {formatCurrency(v.acquisition_cost)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDocs(v)}
                          title="Manage Documents"
                          className="p-1 rounded hover:bg-border text-ink-muted transition-colors"
                        >
                          <FileText size={14} />
                        </button>
                        {isManager && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(v)}
                              title="Edit Vehicle"
                              className="p-1 rounded hover:bg-border text-accent transition-colors"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id, v.registration_number)}
                              title="Delete Vehicle"
                              className="p-1 rounded hover:bg-border text-danger transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Register/Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">
                {editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <p className="stamp border-danger px-2 py-1 text-xs text-danger">{formError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="regNum" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Registration No.
                  </label>
                  <input
                    id="regNum"
                    type="text"
                    required
                    placeholder="e.g. GJ-03-AB-1234"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="model" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Model / Name
                  </label>
                  <input
                    id="model"
                    type="text"
                    required
                    placeholder="e.g. Tata Ultra 1918"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="type" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Vehicle Type
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Mini Van">Mini Van</option>
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="region" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Region / Hub
                  </label>
                  <input
                    id="region"
                    type="text"
                    placeholder="e.g. East"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="maxLoad" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Max Load (kg)
                  </label>
                  <input
                    id="maxLoad"
                    type="number"
                    required
                    min="1"
                    placeholder="500"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="odometer" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Odometer ({distanceUnitLabel === 'mi' ? 'Miles' : 'km'})
                  </label>
                  <input
                    id="odometer"
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="acqCost" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    Cost ({currencySymbol})
                  </label>
                  <input
                    id="acqCost"
                    type="number"
                    required
                    min="1"
                    placeholder="450000"
                    value={acqCost}
                    onChange={(e) => setAcqCost(e.target.value)}
                    className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity font-semibold"
                >
                  {isSubmitting ? 'Saving...' : editingVehicle ? 'Save Changes' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {isDocsOpen && docVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-stamp border border-border bg-surface p-6 shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-display text-base font-semibold text-ink">Manage Documents</h2>
                <p className="text-[10px] text-ink-muted mt-0.5 font-mono">{docVehicle.model} ({docVehicle.registration_number})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDocsOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* List existing documents */}
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Document Registry</h3>
              {docsList.length === 0 ? (
                <p className="text-xs text-ink-muted py-3 text-center border border-dashed border-border rounded-stamp bg-paper/30">
                  No documents found for this vehicle.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {docsList.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-stamp border border-border bg-paper text-xs hover:bg-paper/80">
                      <div className="flex items-center gap-2">
                        <FileText className="text-accent shrink-0" size={16} />
                        <div>
                          <p className="font-medium text-ink">{doc.name}</p>
                          <p className="text-[10px] text-ink-muted font-mono uppercase">{doc.document_type} · Uploaded: {doc.upload_date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={doc.file_content}
                          download={`${doc.name}.pdf`}
                          className="px-2 py-1 text-[10px] bg-border hover:bg-border/80 text-ink rounded-stamp transition-colors font-medium"
                        >
                          View/Download
                        </a>
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1 text-danger hover:bg-border rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload form */}
            {isManager && (
              <form onSubmit={handleUploadDoc} className="mt-6 border-t border-border pt-4 space-y-4">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Upload New Document</h3>
                {docError && (
                  <p className="stamp border-danger px-2 py-1 text-xs text-danger">{docError}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Doc Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Insurance 2026"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                      Document Type
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-stamp border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    >
                      <option value="Insurance">Insurance Policy</option>
                      <option value="Registration">Registration Certificate (RC)</option>
                      <option value="Pollution Certificate">Pollution Certificate (PUC)</option>
                      <option value="Other">Other Certificate</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    File Upload (PDF/Image)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 rounded-stamp border border-dashed border-border bg-paper px-3 py-2 text-xs font-medium text-ink-muted cursor-pointer hover:bg-border transition-colors">
                      <Upload size={14} /> Choose File...
                      <input
                        id="docFileField"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-ink-muted font-mono truncate max-w-xs">
                      {docFile ? 'File loaded successfully' : 'No file chosen'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={docSubmitting}
                    className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity font-semibold"
                  >
                    {docSubmitting ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
