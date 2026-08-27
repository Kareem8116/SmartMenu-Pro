import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Users, Clock, DollarSign, Plus, X } from 'lucide-react';

export default function EmployeesView() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', role: 'waiter', pin: '', salary: 0 });
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'attendance', 'payroll'

  const fetchEmployees = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    try {
      const q = query(collection(db, `branches/${user.branchId}/staff`));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user?.branchId]);

  const handleSaveEmployee = async () => {
    if (!empForm.name || !empForm.pin) return;
    const branchId = user.branchId;
    const staffRef = selectedEmp 
      ? doc(db, `branches/${branchId}/staff`, selectedEmp.id)
      : doc(collection(db, `branches/${branchId}/staff`));
    
    await setDoc(staffRef, {
      name: empForm.name,
      role: empForm.role,
      pin: empForm.pin,
      salary: Number(empForm.salary),
      branchId
    }, { merge: true });

    setShowModal(false);
    fetchEmployees();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-[#2B1810]">Team Management</h2>
          <p className="text-[#685E57] mt-2">Manage staff, track attendance, and handle payroll</p>
        </div>
        <button 
          onClick={() => { setSelectedEmp(null); setEmpForm({ name: '', role: 'waiter', pin: '', salary: 0 }); setShowModal(true); }}
          className="bg-[#6E4A32] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#5C3D28]"
        >
          <Plus size={20} /> Add Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-2 font-bold transition-colors border-b-2 ${activeTab === 'list' ? 'border-[#6E4A32] text-[#2B1810]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} className="inline mr-2" /> Staff List
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-2 font-bold transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-[#6E4A32] text-[#2B1810]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Clock size={16} className="inline mr-2" /> Attendance
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 px-2 font-bold transition-colors border-b-2 ${activeTab === 'payroll' ? 'border-[#6E4A32] text-[#2B1810]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <DollarSign size={16} className="inline mr-2" /> Payroll & Advances
        </button>
      </div>

      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#FAF8F5] text-[#685E57] text-sm">
              <tr>
                <th className="p-4 font-bold">Name</th>
                <th className="p-4 font-bold">Role</th>
                <th className="p-4 font-bold">PIN</th>
                <th className="p-4 font-bold">Base Salary</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="p-4 font-semibold text-[#2B1810]">{emp.name}</td>
                  <td className="p-4 capitalize">{emp.role}</td>
                  <td className="p-4 text-gray-500">****</td>
                  <td className="p-4">{emp.salary} EGP</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => { setSelectedEmp(emp); setEmpForm({ ...emp }); setShowModal(true); }}
                      className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 font-semibold border border-gray-200 shadow-sm">
          <Clock size={48} className="mx-auto mb-4 opacity-20 text-[#6E4A32]" />
          <p>Attendance records (Clock In/Out via PIN) will appear here.</p>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 font-semibold border border-gray-200 shadow-sm">
          <DollarSign size={48} className="mx-auto mb-4 opacity-20 text-[#6E4A32]" />
          <p>Salary advances, bonuses, and deductions will be managed here.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAF8F5]">
              <h2 className="font-bold text-lg text-[#2B1810]">{selectedEmp ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={empForm.name} 
                  onChange={e => setEmpForm({...empForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                <select 
                  value={empForm.role} 
                  onChange={e => setEmpForm({...empForm, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="bar">Bar Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Login PIN (4 digits)</label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={empForm.pin} 
                  onChange={e => setEmpForm({...empForm, pin: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Base Salary (EGP)</label>
                <input 
                  type="number" 
                  value={empForm.salary} 
                  onChange={e => setEmpForm({...empForm, salary: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>
              <button 
                onClick={handleSaveEmployee}
                className="w-full bg-[#6E4A32] text-white font-bold rounded-lg p-3 mt-4 hover:bg-[#5C3D28]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
