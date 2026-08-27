import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Users, Search, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import ManagerLayout from './ManagerLayout';

export default function CustomersView() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [user?.branchId]);

  const fetchCustomers = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, `branches/${user.branchId}/customers`),
        orderBy('totalSpent', 'desc')
      );
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <ManagerLayout>
      <div className="flex flex-col h-full bg-[#FAF8F5]">
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#2B1810] flex items-center gap-2">
                <Users size={28} className="text-[#B45309]" />
                Customer Database
              </h1>
              <p className="text-[#685E57] mt-1">Manage customers and loyalty points</p>
            </div>
            
            {/* Stats Summary */}
            <div className="flex gap-4">
              <div className="bg-[#FAF8F5] p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                <div className="bg-[#E6F4EA] p-2 rounded-lg text-[#15803D]">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-xs text-[#685E57] font-semibold">Total Customers</div>
                  <div className="font-bold text-[#2B1810]">{customers.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-gray-200 rounded-xl outline-none focus:border-[#6E4A32] focus:ring-1 focus:ring-[#6E4A32]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E4A32]"></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-gray-200 text-[#685E57] text-sm">
                    <th className="p-4 font-semibold">Customer Name</th>
                    <th className="p-4 font-semibold">Phone</th>
                    <th className="p-4 font-semibold">Loyalty Points</th>
                    <th className="p-4 font-semibold">Total Orders</th>
                    <th className="p-4 font-semibold">Total Spent</th>
                    <th className="p-4 font-semibold">Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(customer => (
                      <tr key={customer.id} className="border-b border-gray-50 hover:bg-[#FAF8F5] transition-colors">
                        <td className="p-4 font-bold text-[#2B1810]">{customer.name}</td>
                        <td className="p-4 text-[#685E57]">{customer.phone}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 font-bold text-[#B45309]">
                            <Award size={16} />
                            {customer.loyaltyPoints || 0}
                          </div>
                        </td>
                        <td className="p-4 text-[#685E57] font-semibold">{customer.totalOrders || 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 font-bold text-[#15803D]">
                            <DollarSign size={16} />
                            {(customer.totalSpent || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#685E57]">
                          {customer.createdAt?.toDate ? new Date(customer.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}
