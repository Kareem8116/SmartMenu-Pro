# SmartMenu Pro — Firestore Schema

> هذا المستند يوثّق بنية Firestore الكاملة لمشروع SmartMenu Pro.
> أي تغيير في البنية يجب أن يُحدَّث هنا أولاً.

---

## `/owners/{ownerId}`
بيانات صاحب الكافيه/المطعم (عميل النظام).

| الحقل | النوع | الوصف |
|---|---|---|
| `name` | `string` | اسم صاحب الكافيه |
| `email` | `string` | البريد الإلكتروني |
| `phone` | `string` | رقم الهاتف |
| `branchIds` | `array<string>` | قائمة معرّفات الفروع المملوكة |
| `createdAt` | `timestamp` | تاريخ الإنشاء |
| `updatedAt` | `timestamp` | تاريخ آخر تحديث |

---

## `/branches/{branchId}`
بيانات الفرع الواحد.

| الحقل | النوع | الوصف |
|---|---|---|
| `ownerId` | `string` | معرّف صاحب الكافيه |
| `name` | `string` | اسم الفرع |
| `nameAr` | `string` | اسم الفرع بالعربي |
| `address` | `string` | العنوان |
| `phone` | `string` | رقم الهاتف |
| `currency` | `string` | العملة (مثال: `EGP`) |
| `taxRate` | `number` | نسبة الضريبة (VAT) |
| `timezone` | `string` | المنطقة الزمنية |
| `createdAt` | `timestamp` | تاريخ الإنشاء |
| `updatedAt` | `timestamp` | تاريخ آخر تحديث |

---

## `/branches/{branchId}/staff/{staffId}`
بيانات الموظفين في الفرع.

| الحقل | النوع | الوصف |
|---|---|---|
| `name` | `string` | اسم الموظف |
| `role` | `string` | الدور: `admin` / `cashier` / `waiter` / `chef` |
| `pinHash` | `string` | PIN مشفّر (bcrypt) — ممنوع plaintext |
| `isActive` | `boolean` | نشط أم معطّل |
| `branchId` | `string` | معرّف الفرع |
| `createdAt` | `timestamp` | تاريخ الإنشاء |

---

## `/branches/{branchId}/stations/{stationId}`
حسابات المحطات (POS/KDS) في الفرع.

| الحقل | النوع | الوصف |
|---|---|---|
| `type` | `string` | نوع المحطة: `pos` / `kds` |
| `name` | `string` | اسم المحطة (مثال: "كاشير 1") |
| `linkedUserId` | `string` | Firebase Auth UID المرتبط بالمحطة |
| `branchId` | `string` | معرّف الفرع |
| `isActive` | `boolean` | نشطة أم معطّلة |
| `createdAt` | `timestamp` | تاريخ الإنشاء |

---

## `/branches/{branchId}/orders/{orderId}`
الطلبات (تُبنى في المرحلة 1).

| الحقل | النوع | الوصف |
|---|---|---|
| `branchId` | `string` | معرّف الفرع |
| `type` | `string` | `dine-in` / `takeaway` / `delivery` / `drive-thru` |
| `tableId` | `string?` | معرّف الطاولة (للأكل في المكان) |
| `status` | `string` | `pending` / `preparing` / `ready` / `served` / `paid` / `cancelled` |
| `items` | `array<OrderItem>` | الأصناف المطلوبة |
| `subtotal` | `number` | المجموع قبل الضريبة |
| `tax` | `number` | الضريبة |
| `total` | `number` | الإجمالي |
| `payments` | `array<Payment>` | طرق الدفع المستخدمة |
| `staffId` | `string` | الموظف الذي أنشأ الطلب |
| `stationId` | `string` | المحطة التي أُنشئ منها |
| `createdAt` | `timestamp` | تاريخ الإنشاء |
| `updatedAt` | `timestamp` | تاريخ آخر تحديث |

---

## `/branches/{branchId}/menu/{itemId}`
أصناف المنيو (تُبنى في المرحلة 1).

| الحقل | النوع | الوصف |
|---|---|---|
| `branchId` | `string` | معرّف الفرع |
| `name` | `string` | اسم الصنف (EN) |
| `nameAr` | `string` | اسم الصنف (AR) |
| `category` | `string` | التصنيف |
| `price` | `number` | السعر |
| `station` | `string` | المحطة الموجّه لها: `kitchen` / `bar` |
| `is86ed` | `boolean` | نافذ (غير متاح) |
| `prepTime` | `number` | وقت التحضير بالدقائق |
| `imageUrl` | `string?` | رابط الصورة |
| `isActive` | `boolean` | متاح في المنيو |
| `createdAt` | `timestamp` | تاريخ الإنشاء |

---

## `/branches/{branchId}/inventory/{itemId}`
المخزون والخامات (تُبنى في المرحلة 5).

| الحقل | النوع | الوصف |
|---|---|---|
| `branchId` | `string` | معرّف الفرع |
| `name` | `string` | اسم الخامة |
| `unit` | `string` | الوحدة (كجم، لتر، قطعة) |
| `currentQty` | `number` | الكمية الحالية |
| `minQty` | `number` | الحد الأدنى (للتنبيه) |
| `costPerUnit` | `number` | تكلفة الوحدة |
| `barcode` | `string?` | الباركود |
| `updatedAt` | `timestamp` | تاريخ آخر تحديث |

---

## `/branches/{branchId}/customers/{customerId}`
سجل العملاء (تُبنى في المرحلة 6).

| الحقل | النوع | الوصف |
|---|---|---|
| `branchId` | `string` | معرّف الفرع |
| `name` | `string` | اسم العميل |
| `phone` | `string` | رقم الهاتف |
| `loyaltyPoints` | `number` | نقاط الولاء |
| `walletBalance` | `number` | رصيد المحفظة |
| `totalOrders` | `number` | إجمالي الطلبات |
| `totalSpent` | `number` | إجمالي الإنفاق |
| `createdAt` | `timestamp` | تاريخ الإنشاء |

---

## `/branches/{branchId}/auditLogs/{logId}`
سجل التدقيق لكل العمليات الحساسة.

| الحقل | النوع | الوصف |
|---|---|---|
| `branchId` | `string` | معرّف الفرع |
| `action` | `string` | نوع العملية |
| `performedBy` | `string` | معرّف الموظف |
| `stationId` | `string` | معرّف المحطة |
| `details` | `map` | تفاصيل التغيير |
| `timestamp` | `timestamp` | وقت العملية |

---

## `/system/licenses/{branchId}`
تراخيص الفروع (يتحكم فيها Super Admin).

| الحقل | النوع | الوصف |
|---|---|---|
| `status` | `string` | `active` / `suspended` |
| `enabledFeatures` | `map<string, boolean>` | الميزات المفعّلة (pos, kds, inventory, crm, ai-waste, ai-demand...) |
| `subscriptionExpiresAt` | `timestamp` | تاريخ انتهاء الاشتراك |
| `createdAt` | `timestamp` | تاريخ الإنشاء |
| `updatedAt` | `timestamp` | تاريخ آخر تحديث |

---

## `/system/auditLogs/{logId}`
سجل تدقيق Super Admin.

| الحقل | النوع | الوصف |
|---|---|---|
| `action` | `string` | نوع العملية (activate/suspend branch, enable/disable feature, create/disable user) |
| `performedBy` | `string` | معرّف Super Admin |
| `targetBranchId` | `string?` | الفرع المتأثر |
| `targetUserId` | `string?` | المستخدم المتأثر |
| `details` | `map` | تفاصيل التغيير |
| `timestamp` | `timestamp` | وقت العملية |
