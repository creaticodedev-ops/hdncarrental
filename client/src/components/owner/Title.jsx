import React from 'react'
import { PageHeader } from '../../admin/ui'

/**
 * Legacy Title adapter → PageHeader (keeps existing call sites working).
 */
const Title = ({ title, subTitle, primaryAction, secondaryAction, breadcrumb }) => (
  <PageHeader
    title={title}
    description={subTitle}
    primaryAction={primaryAction}
    secondaryAction={secondaryAction}
    breadcrumb={breadcrumb}
  />
)

export default Title
