import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Palette, 
  Bell, 
  TrendingUp, 
  Store, 
  Users, 
  Settings,
  LogOut,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onLogout: () => void;
  onClose: () => void;
  userRole: string | null;
}

const menuItems = [
  { icon: LayoutDashboard, text: 'Dashboard', path: '/' },
  { icon: ShoppingBag, text: 'Productos', path: '/products' },
  { icon: Palette, text: 'Diseños DTF', path: '/designs' },
  { icon: Bell, text: 'Alertas', path: '/alerts' },
  { icon: TrendingUp, text: 'Tendencias', path: '/trends' },
  { icon: Store, text: 'Sincronización', path: '/sync' },
  { icon: Users, text: 'Usuarios', path: '/users', adminOnly: true },
  { icon: Settings, text: 'Configuración', path: '/settings' },
];

export function Sidebar({ isOpen, onLogout, onClose, userRole }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen bg-white dark:bg-gray-800 shadow-lg 
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          transition-transform duration-300 w-64 flex flex-col overflow-y-auto z-30`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-xl text-gray-800 dark:text-white">DTF Manager</h2>
          <button 
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 py-4">
          {menuItems
            .filter(item => !item.adminOnly || (item.adminOnly && userRole === 'admin'))
            .map((item, index) => (
              <NavLink
                key={index}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) => `
                  flex items-center py-3 px-6 text-sm
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/50 border-r-4 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="ml-3">{item.text}</span>
              </NavLink>
            ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center w-full py-2 px-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span className="ml-3">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center w-full py-2 px-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}