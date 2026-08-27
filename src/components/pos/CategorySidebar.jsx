import { Coffee, Pizza, Croissant, IceCream, Utensils } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as dexieDb } from '../../services/db';
import { useAuth } from '../../hooks/useAuth';

// Icon mapper based on category ID
const CATEGORY_ICONS = {
  hot: Coffee,
  cold: IceCream,
  bakery: Croissant,
  food: Pizza,
  default: Utensils
};

export default function CategorySidebar({ activeCategory, onSelectCategory, language }) {
  const { user } = useAuth();
  
  const categories = useLiveQuery(
    async () => {
      if (!user?.branchId) return [];
      const items = await dexieDb.menu
        .where('branchId')
        .equals(user.branchId)
        .filter(item => item.isActive)
        .toArray();
      
      const uniqueCats = new Set();
      items.forEach(i => {
        if (i.categoryId) uniqueCats.add(i.categoryId);
      });
      
      const catArray = [
        { id: 'all', name: 'All Items', nameAr: 'كل الأصناف', icon: Utensils }
      ];
      
      Array.from(uniqueCats).forEach(catId => {
        catArray.push({
          id: catId,
          name: catId.charAt(0).toUpperCase() + catId.slice(1), // Basic fallback name
          nameAr: catId, // Basic fallback name
          icon: CATEGORY_ICONS[catId] || CATEGORY_ICONS.default
        });
      });
      
      return catArray;
    },
    [user?.branchId],
    [{ id: 'all', name: 'All Items', nameAr: 'كل الأصناف', icon: Utensils }]
  );

  return (
    <aside className="w-24 lg:w-32 bg-white h-full border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 shadow-sm z-10 relative">
      <div className="py-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex flex-col items-center justify-center p-3 mb-2 transition-colors border-l-4 ${
                isActive 
                  ? 'border-l-[#6E4A32] bg-[#FAF8F5] text-[#2B1810]' 
                  : 'border-l-transparent text-gray-500 hover:bg-gray-50 hover:text-[#6E4A32]'
              }`}
              style={{ minHeight: '80px' }}
            >
              <div className={`p-3 rounded-full mb-2 ${isActive ? 'bg-[#5C3D28] text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon size={24} />
              </div>
              <span className="text-xs font-semibold text-center leading-tight capitalize">
                {language === 'ar' ? cat.nameAr : cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
