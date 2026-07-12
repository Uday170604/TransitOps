// Thin API wrapper using Axios.
//
// TO SWITCH TO THE REAL BACKEND LATER:
// 1. Set VITE_API_BASE_URL in a .env file (e.g. VITE_API_BASE_URL=http://localhost:8000)
// 2. Set USE_MOCK to false below.
// 3. Confirm the /auth/login response shape matches what login() expects
//    ({ token, user: { id, name, email, role } }) or adjust it to match FastAPI.

import axios from 'axios'
import { mockLogin } from '../data/mockAuth.js'

const USE_MOCK = false
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

// Request interceptor to attach authentication token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('transitops_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle data extraction and standardized error messages
axiosInstance.interceptors.response.use(
  (response) => {
    const resData = response.data
    // If the response follows the standardized backend envelope: { success, status_code, message, data }
    if (resData && typeof resData === 'object' && 'success' in resData) {
      if (!resData.success) {
        throw new Error(resData.message || 'Request failed')
      }
      return resData.data
    }
    return resData
  },
  (error) => {
    let detail = error.response?.data?.detail
    if (Array.isArray(detail)) {
      // Format validation errors nicely (e.g. from FastAPI ValidationError)
      detail = detail.map((d) => `${d.loc.join('.')}: ${d.msg}`).join('; ')
    } else if (typeof detail !== 'string') {
      detail = error.response?.data?.message || error.message || 'Request failed'
    }
    return Promise.reject(new Error(detail))
  }
)

async function request(path, options = {}) {
  const { method = 'GET', body, headers, ...extraOptions } = options

  // In Axios, request body is passed via 'data'.
  // If the body was passed as a JSON string, parse it back to a JS object.
  let data = body
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body)
    } catch (e) {
      // Fallback to raw value
    }
  }

  try {
    return await axiosInstance({
      url: path,
      method,
      data,
      headers,
      ...extraOptions,
    })
  } catch (err) {
    throw err
  }
}

export async function login(email, password) {
  if (USE_MOCK) {
    return mockLogin(email, password)
  }
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function getVehicles() {
  return request('/api/v1/vehicles/')
}

export async function createVehicle(data) {
  return request('/api/v1/vehicles/', {
    method: 'POST',
    body: data,
  })
}

export async function updateVehicle(id, data) {
  return request(`/api/v1/vehicles/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteVehicle(id) {
  return request(`/api/v1/vehicles/${id}`, {
    method: 'DELETE',
  })
}

export async function getDrivers() {
  return request('/api/v1/drivers/')
}

export async function createDriver(data) {
  return request('/api/v1/drivers/', {
    method: 'POST',
    body: data,
  })
}

export async function updateDriver(id, data) {
  return request(`/api/v1/drivers/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteDriver(id) {
  return request(`/api/v1/drivers/${id}`, {
    method: 'DELETE',
  })
}

export async function getTrips() {
  return request('/api/v1/trips/')
}

export async function createTrip(data) {
  return request('/api/v1/trips/', {
    method: 'POST',
    body: data,
  })
}

export async function updateTripStatus(id, status, currentOdometer) {
  return request(`/api/v1/trips/${id}/status`, {
    method: 'PATCH',
    body: { status, current_odometer: currentOdometer },
  })
}

export async function getMaintenanceLogs() {
  return request('/api/v1/maintenance/')
}

export async function createMaintenanceLog(data) {
  return request('/api/v1/maintenance/', {
    method: 'POST',
    body: data,
  })
}

export async function closeMaintenanceLog(id, endDate, cost) {
  return request(`/api/v1/maintenance/${id}/close`, {
    method: 'POST',
    body: { end_date: endDate, cost },
  })
}

export const api = { request }

