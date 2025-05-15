# Sistema de Inventario DTF

Este es un sistema de gestión de inventario desarrollado con React, TypeScript y Vite, utilizando Supabase como backend. La aplicación permite gestionar y dar seguimiento al inventario de manera eficiente y moderna.

## 🚀 Características

- Interfaz de usuario moderna y responsive con Tailwind CSS
- Gestión de inventario en tiempo real
- Autenticación y autorización con Supabase
- Visualización de datos con Recharts
- Navegación fluida con React Router

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Cuenta en Supabase para la base de datos

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd inventario-dtf
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

## 🚀 Uso

Para iniciar el servidor de desarrollo:
```bash
npm run dev
```

Para construir el proyecto para producción:
```bash
npm run build
```

Para previsualizar la versión de producción:
```bash
npm run preview
```

## 🛠️ Tecnologías Utilizadas

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Router DOM
- Recharts para visualización de datos
- Lucide React para iconos

## 📦 Estructura del Proyecto

```
inventario-dtf/
├── src/               # Código fuente
├── public/            # Archivos estáticos
├── supabase/         # Configuración de Supabase
├── .git/             # Configuración de Git
├── node_modules/     # Dependencias
└── ...               # Archivos de configuración
```

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría realizar.

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
