import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

/** Deep links from Fleet / Edit car open the performance workspace with the drawer selected. */
const VehicleStatsPage = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/owner/vehicle-stats?vehicle=${id}` : '/owner/vehicle-stats'} replace />
}

export default VehicleStatsPage
