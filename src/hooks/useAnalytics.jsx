import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useBranch } from '../context/BranchContext';

export function useAnalytics(dateRange = 'today') {
  const { activeBranchId } = useBranch();
  const [data, setData] = useState({
    totalSales: 0,
    orderVolume: 0,
    averageOrderValue: 0,
    salesData: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBranchId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function fetchAnalytics() {
      try {
        const branchesToFetch = activeBranchId === 'all' ? branches : branches.filter(b => b.id === activeBranchId);
        
        if (branchesToFetch.length === 0) {
          if (isMounted) setLoading(false);
          return;
        }

        // Calculate date boundaries
        const now = new Date();
        let startDate = new Date();
        
        if (dateRange === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else if (dateRange === 'month') {
          startDate.setMonth(now.getMonth() - 1);
        }

        let total = 0;
        let count = 0;
        const chartMap = {};
        let recent = [];
        const itemCounts = {};
        const branchSalesMap = {};
        
        let lastWeekTotal = 0;
        let lastWeekCount = 0;
        const lastWeekStart = new Date(startDate);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
        
        const alertsList = [];

        // Fetch from all active branches in parallel
        await Promise.all(branchesToFetch.map(async (branch) => {
          branchSalesMap[branch.name] = 0;
          
          // 1. Fetch Orders for KPIs and Top Items
          const ordersRef = collection(db, `branches/${branch.id}/orders`);
          const statsQuery = query(
            ordersRef,
            where('status', 'in', ['served', 'ready']),
            orderBy('createdAt', 'desc'),
            limit(200) // limit for performance in this demo
          );

          const snapshot = await getDocs(statsQuery);

          snapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

            const amount = order.totals?.total || 0;

            // Current Period
            if (orderDate >= startDate) {
              total += amount;
              count++;
              branchSalesMap[branch.name] += amount;

              // Top items counting
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const itemName = item.name || item.nameAr || 'Unknown Item';
                  itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
                });
              }

              // Chart grouping
              const dateStr = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const hourStr = orderDate.getHours() + ':00';
              const groupKey = dateRange === 'today' ? hourStr : dateStr;
              chartMap[groupKey] = (chartMap[groupKey] || 0) + amount;

              recent.push({ id: docSnap.id, branchName: branch.name, ...order });
            } 
            // Last Week Period (for comparison)
            else if (orderDate >= lastWeekStart && orderDate <= lastWeekEnd) {
              lastWeekTotal += amount;
              lastWeekCount++;
            }
          });
          
          // 2. Fetch Low Stock Alerts
          try {
            const invRef = collection(db, `branches/${branch.id}/inventory`);
            const invSnapshot = await getDocs(invRef);
            invSnapshot.forEach(docSnap => {
              const item = docSnap.data();
              if (item.currentQty !== undefined && item.minQty !== undefined && item.currentQty <= item.minQty) {
                alertsList.push({
                  type: 'stock',
                  text: `${item.name || 'Item'} is critically low (${item.currentQty} ${item.unit || ''}) at ${branch.name}`,
                  time: 'Just now'
                });
              }
            });
          } catch (err) {
            console.error("Error fetching inventory alerts for branch", branch.id, err);
          }
        }));

        // Sort recent orders globally by date
        recent.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        recent = recent.slice(0, 5);
        
        // Calculate Top Items
        const sortedTopItems = Object.keys(itemCounts)
          .map(name => ({ name, count: itemCounts[name] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
          
        // Format Branch Performance
        const branchPerformance = Object.keys(branchSalesMap)
          .map(name => ({ name, sales: branchSalesMap[name] }))
          .sort((a, b) => b.sales - a.sales);
          
        // Calculate Comparisons
        const salesGrowth = lastWeekTotal > 0 ? ((total - lastWeekTotal) / lastWeekTotal) * 100 : 0;
        const ordersGrowth = lastWeekCount > 0 ? ((count - lastWeekCount) / lastWeekCount) * 100 : 0;

        const salesArray = Object.keys(chartMap).map(key => ({
          name: key,
          sales: chartMap[key]
        }));

        // Add dummy review alerts just to satisfy Phase 10 UI if none exist
        if (alertsList.length === 0) {
           alertsList.push({ type: 'review', text: 'No new critical alerts.', time: 'Now' });
        }

        if (isMounted) {
          setData({
            totalSales: total,
            orderVolume: count,
            averageOrderValue: count > 0 ? (total / count) : 0,
            salesData: salesArray.reverse(),
            recentOrders: recent,
            topItems: sortedTopItems,
            branchPerformance,
            alerts: alertsList,
            comparison: {
              salesGrowth,
              ordersGrowth
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAnalytics();

    return () => { isMounted = false; };
  }, [activeBranchId, dateRange]);

  return { data, loading };
}
