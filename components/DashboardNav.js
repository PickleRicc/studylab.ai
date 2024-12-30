import { 
  HomeIcon, 
  DocumentIcon, 
  BookOpenIcon,
  AcademicCapIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/router'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Files', href: '/files', icon: DocumentIcon },
  { name: 'Flashcards', href: '/flashcards', icon: BookOpenIcon },
  { name: 'Tests', href: '/tests', icon: AcademicCapIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
]

export default function DashboardNav() {
  const router = useRouter()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = router.pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              group flex items-center px-3 py-2 text-sm font-medium rounded-md
              ${isActive 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            <item.icon
              className={`
                flex-shrink-0 -ml-1 mr-3 h-6 w-6
                ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
              `}
              aria-hidden="true"
            />
            <span className="truncate">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
