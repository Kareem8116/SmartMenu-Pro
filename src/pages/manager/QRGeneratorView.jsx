import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { QrCode, Printer, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRGeneratorView() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      if (!user?.branchId) return;
      try {
        const q = query(collection(db, `branches/${user.branchId}/tables`));
        const snapshot = await getDocs(q);
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setTables(data.sort((a,b) => a.number - b.number));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, [user?.branchId]);

  const generateUrl = (tableId) => {
    return `${window.location.origin}/menu/${user?.branchId}/${tableId}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading tables...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-[#2B1810]">QR Menu Generator</h2>
          <p className="text-[#685E57] mt-2">Generate and print QR codes for all your tables.</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-[#6E4A32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5C3D28] transition-colors shadow-sm"
        >
          <Printer size={20} /> Print QRs
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center print:shadow-none print:border-gray-400">
            <h3 className="font-bold text-xl text-[#2B1810] mb-4">Table {table.number}</h3>
            
            <div className="bg-white p-2 rounded-xl shadow-inner border border-gray-100 mb-4">
              <QRCodeSVG 
                value={generateUrl(table.id)}
                size={160}
                bgColor={"#ffffff"}
                fgColor={"#2B1810"}
                level={"M"}
                includeMargin={false}
              />
            </div>
            
            <p className="text-xs text-gray-400 mt-2 print:hidden break-all px-2">
              {generateUrl(table.id)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
