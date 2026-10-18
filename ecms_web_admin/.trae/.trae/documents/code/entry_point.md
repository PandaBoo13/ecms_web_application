# Code Architecture Entry Point

## 1. Định vị mã nguồn
* **Backend Source**: [`com.ecms_web_application.OC01`](file:///home/lenovo/Downloads/DATN/ecms_web_application/OC01/src/main/java/com/ecms_web_application/OC01)
  * Controller: [`com.ecms_web_application.OC01.controller`](file:///home/lenovo/Downloads/DATN/ecms_web_application/OC01/src/main/java/com/ecms_web_application/OC01/controller)
  * Service: [`com.ecms_web_application.OC01.service`](file:///home/lenovo/Downloads/DATN/ecms_web_application/OC01/src/main/java/com/ecms_web_application/OC01/service)
  * Repository: [`com.ecms_web_application.OC01.repository`](file:///home/lenovo/Downloads/DATN/ecms_web_application/OC01/src/main/java/com/ecms_web_application/OC01/repository)
  * Entity: [`com.ecms_web_application.OC01.entity`](file:///home/lenovo/Downloads/DATN/ecms_web_application/OC01/src/main/java/com/ecms_web_application/OC01/entity)
* **Frontend Source**: [`ecms_web_admin/src`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src)
  * Pages Lead: [`src/pages/admin/leads/LeadListPage.tsx`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/pages/admin/leads/LeadListPage.tsx)
  * Pages Student: [`src/pages/admin/students/StudentListPage.tsx`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/pages/admin/students/StudentListPage.tsx)
  * Services API: [`src/services/api`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/services/api)
  * Service Types: [`src/services/types`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/services/types)
  * Routes Config: [`src/routes/index.tsx`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/routes/index.tsx)
  * Multi-language (i18n): [`src/stores/localeStore.ts`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/stores/localeStore.ts), [`src/locales`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/locales), [`src/components/layout/LanguageDropdown.tsx`](file:///home/lenovo/Downloads/DATN/ecms_web_application/ecms_web_admin/src/components/layout/LanguageDropdown.tsx)

## 2. Luồng thực thi chi tiết
* Xem [code/flow.md](file:///home/lenovo/Downloads/DATN/ecms_web_application/.trae/documents/code/flow.md)

