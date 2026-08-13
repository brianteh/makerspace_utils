import Fleet from './pages/Fleet.svelte'
import Calendar from './pages/Calendar.svelte'
import Admin from './pages/Admin.svelte'

export default [
  {
    path: '/fleet',
    name: '3D Printer Fleet',
    description: 'Live status of all printers',
    component: Fleet,
  },
  {
    path: '/calendar',
    name: 'Calendar',
    description: 'Event calendar with tooltips',
    component: Calendar,
  },
  {
    path: '/admin',
    name: 'Admin',
    description: 'Manage events and printers',
    component: Admin,
  },
]
