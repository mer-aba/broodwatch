import Link from 'next/link'
import { Leaf } from 'lucide-react'

export default function Brand() {
  return (
    <Link className="brand" href="/dashboard" aria-label="BroodWatch dashboard">
      <span className="brand-mark">
        <Leaf size={20} />
      </span>
      <span className="brand-name">
        brood<span>watch</span>
        <small>FLOCK MANAGEMENT</small>
      </span>
    </Link>
  )
}
