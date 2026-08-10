import { useNavigate, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { useAdminBrands } from '@/features/admin/brands/useAdminBrands';
import { BrandForm } from '@/features/admin/brands/BrandForm';

export function BrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { brands, loading, error } = useAdminBrands();

  const brand = id ? brands.find((b) => b.id === Number(id)) : undefined;
  const isEditing = id !== undefined;

  return (
    <Container className="py-10">
      <h1 className="text-2xl">{isEditing ? 'Editar marca' : 'Nova marca'}</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}

      {!loading && !error && isEditing && !brand && (
        <p className="mt-6 text-sm text-danger-500">Marca não encontrada.</p>
      )}

      {!loading && !error && (!isEditing || brand) && (
        <Card className="mt-6 max-w-xl p-6">
          <BrandForm
            brand={brand}
            onSaved={() => navigate('/admin/marcas')}
            onCancel={() => navigate('/admin/marcas')}
          />
        </Card>
      )}
    </Container>
  );
}
