// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — CompanyFormPage UI Component
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, ArrowLeft, Building2, MapPin, Landmark, Upload } from 'lucide-react';
import { companySchema, CompanyFormData } from './company.schema';
import { useIpc } from '../../hooks/useIpc';
import { loadCompanyContext } from '../../services/company-context';
import { Button, Input, FormSelect, useToast } from '../../components/ui';

const LIST_ROUTE = '/masters/business/companies';

interface StateCodeObj {
  stateCode: string;
  stateName: string;
}

export const CompanyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;

  const [statesList, setStatesList] = useState<StateCodeObj[]>([]);

  // IPC Hooks
  const { invoke: fetchCompany } = useIpc<any>('company:get');
  const { invoke: createCompany, loading: creating } = useIpc<any>('company:create');
  const { invoke: updateCompany, loading: updating } = useIpc<any>('company:update');
  const { invoke: fetchStates } = useIpc<any>('company:states');

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: '',
      companyCode: '',
      panNumber: '',
      gstinNumber: '',
      tanNumber: '',
      udyamMsme: '',
      iecCode: '',
      gstEnabled: true,
      gstRegistrationDate: '',
      businessType: '',
      status: 'ACTIVE',
      isDefault: false,
      logoPath: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateCode: '',
      pincode: '',
      mobile: '',
      phone: '',
      email: '',
      website: '',
      bankAccountNumber: '',
      bankName: '',
      bankBranch: '',
      bankIfsc: '',
      bankSwift: '',
    },
  });

  // Load state list & company if in edit mode
  useEffect(() => {
    const loadData = async () => {
      const statesRes = await fetchStates();
      if (statesRes && statesRes.success) {
        setStatesList(statesRes.data);
      }

      if (isEdit) {
        const companyRes = await fetchCompany(parseInt(id!));
        if (companyRes && companyRes.success && companyRes.data) {
          const c = companyRes.data;
          // Format date for input field
          let gstRegDateStr = '';
          if (c.gstRegistrationDate) {
            gstRegDateStr = new Date(c.gstRegistrationDate).toISOString().split('T')[0];
          }

          reset({
            companyName: c.companyName || '',
            companyCode: c.companyCode || '',
            panNumber: c.panNumber || '',
            gstinNumber: c.gstinNumber || '',
            tanNumber: c.tanNumber || '',
            udyamMsme: c.udyamMsme || '',
            iecCode: c.iecCode || '',
            gstEnabled: c.gstEnabled ?? true,
            gstRegistrationDate: gstRegDateStr,
            businessType: c.businessType || '',
            status: c.status || 'ACTIVE',
            isDefault: c.isDefault ?? false,
            logoPath: c.logoPath || '',
            addressLine1: c.addressLine1 || '',
            addressLine2: c.addressLine2 || '',
            city: c.city || '',
            stateCode: c.stateCode || '',
            pincode: c.pincode || '',
            mobile: c.mobile || '',
            phone: c.phone || '',
            email: c.email || '',
            website: c.website || '',
            bankAccountNumber: c.bankAccountNumber || '',
            bankName: c.bankName || '',
            bankBranch: c.bankBranch || '',
            bankIfsc: c.bankIfsc || '',
            bankSwift: c.bankSwift || '',
          });
        } else {
          showToast(companyRes?.error || 'Failed to fetch company details', 'error');
          navigate(LIST_ROUTE);
        }
      }
    };
    loadData();
  }, [id, isEdit, fetchCompany, fetchStates, reset, navigate, showToast]);

  const onSubmit = async (data: CompanyFormData) => {
    let res;
    if (isEdit) {
      res = await updateCompany({ id: parseInt(id!), data });
    } else {
      res = await createCompany(data);
    }

    if (res && res.success) {
      showToast(isEdit ? 'Company updated successfully' : 'Company created successfully', 'success');
      await loadCompanyContext();
      navigate(LIST_ROUTE);
    } else {
      showToast(res?.error || 'An error occurred while saving', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(LIST_ROUTE)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {isEdit ? 'Edit Company' : 'Add Company'}
            </h1>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {isEdit ? 'Modify legal profile and credentials' : 'Register a new legal business entity'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* General Info */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} />
              <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>
                General Info
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <Input
                label="Company Name *"
                placeholder="e.g. Diastar Exports Pvt Ltd"
                error={errors.companyName?.message}
                {...register('companyName')}
              />
              <Input
                label="Company Code *"
                placeholder="e.g. DST"
                maxLength={3}
                error={errors.companyCode?.message}
                {...register('companyCode')}
              />
              <Input
                label="PAN Number *"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                error={errors.panNumber?.message}
                {...register('panNumber')}
              />
              <Input
                label="GSTIN (Optional)"
                placeholder="e.g. 24ABCDE1234F1Z5"
                maxLength={15}
                error={errors.gstinNumber?.message}
                {...register('gstinNumber')}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Company Logo</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1px dashed var(--color-border)', padding: '8px 12px', borderRadius: '6px', background: '#f8fafc', minHeight: '52px' }}>
                  {watch('logoPath') ? (
                    <>
                      <img
                        src={watch('logoPath')!}
                        alt="Company Logo Preview"
                        style={{
                          height: '36px',
                          width: '100px',
                          objectFit: 'contain',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          background: '#fff',
                          padding: '2px'
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setValue('logoPath', '')}
                        style={{ color: '#ef4444', fontSize: '11px', padding: '4px 8px' }}
                      >
                        Remove Logo
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/png,image/jpeg,image/svg+xml';
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500 * 1024) {
                            showToast('Image must be under 500KB', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setValue('logoPath', ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        };
                        input.click();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 8px' }}
                    >
                      <Upload size={12} /> Upload Logo Image
                    </Button>
                  )}
                </div>
              </div>
              <Input
                label="TAN (Optional)"
                placeholder="e.g. AHMD01234F"
                maxLength={10}
                error={errors.tanNumber?.message}
                {...register('tanNumber')}
              />
              <Input
                label="Udyam MSME (Optional)"
                placeholder="e.g. UDYAM-GJ-01-0123456"
                error={errors.udyamMsme?.message}
                {...register('udyamMsme')}
              />
              <Input
                label="IEC Code (Import Export Code)"
                placeholder="e.g. 0500123456"
                error={errors.iecCode?.message}
                {...register('iecCode')}
              />
              <Input
                label="Business Type"
                placeholder="e.g. Manufacturing, Wholesaler"
                error={errors.businessType?.message}
                {...register('businessType')}
              />
              <FormSelect
                control={control}
                name="status"
                label="Status"
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'INACTIVE', label: 'INACTIVE' },
                  { value: 'SUSPENDED', label: 'SUSPENDED' },
                ]}
                searchable={false}
                clearable={false}
              />

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    {...register('gstEnabled')}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                  />
                  <span>Enable GST calculation for this company</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    {...register('isDefault')}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                  />
                  <span>Set as default selected company on startup</span>
                </label>
              </div>
            </div>
          </section>

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          {/* Contact & Address */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} />
              <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>
                Contact & Address
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <Input
                label="Address Line 1"
                placeholder="Flat / Office Number, Building Name"
                error={errors.addressLine1?.message}
                {...register('addressLine1')}
              />
              <Input
                label="Address Line 2"
                placeholder="Road Name, Area, Locality"
                error={errors.addressLine2?.message}
                {...register('addressLine2')}
              />
              <Input
                label="City"
                placeholder="e.g. Surat"
                error={errors.city?.message}
                {...register('city')}
              />
              <FormSelect
                control={control}
                name="stateCode"
                label="State Code / State"
                placeholder="Select State"
                error={errors.stateCode?.message}
                creatable={true}
                options={statesList.map((st) => ({
                  value: st.stateCode,
                  label: `${st.stateCode} - ${st.stateName}`,
                }))}
              />
              <Input
                label="Pincode"
                placeholder="6-digit Indian Pincode"
                maxLength={6}
                error={errors.pincode?.message}
                {...register('pincode')}
              />
              <Input
                label="Email"
                placeholder="e.g. contact@diastar.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Mobile Number"
                placeholder="10-digit mobile"
                error={errors.mobile?.message}
                {...register('mobile')}
              />
              <Input
                label="Phone Number"
                placeholder="Landline number"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Input
                label="Website URL"
                placeholder="e.g. www.diastar.com"
                error={errors.website?.message}
                {...register('website')}
              />
            </div>
          </section>

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          {/* Bank Details */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={16} />
              <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-primary)' }}>
                Bank Details
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <Input
                label="Bank Name"
                placeholder="e.g. State Bank of India"
                error={errors.bankName?.message}
                {...register('bankName')}
              />
              <Input
                label="Bank Account Number"
                placeholder="Enter account number"
                error={errors.bankAccountNumber?.message}
                {...register('bankAccountNumber')}
              />
              <Input
                label="Bank Branch"
                placeholder="e.g. Surat Main Branch"
                error={errors.bankBranch?.message}
                {...register('bankBranch')}
              />
              <Input
                label="IFSC Code"
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                error={errors.bankIfsc?.message}
                {...register('bankIfsc')}
              />
              <Input
                label="SWIFT Code (Optional)"
                placeholder="e.g. SBININBB123"
                maxLength={11}
                error={errors.bankSwift?.message}
                {...register('bankSwift')}
              />
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 30px', background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(LIST_ROUTE)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={creating || updating}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} /> Save Company
          </Button>
        </div>
      </form>
    </div>
  );
};
