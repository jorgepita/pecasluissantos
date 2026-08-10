import { useNavigate, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { useAdminCategories } from '@/features/admin/categories/useAdminCategories';
import { CategoryForm } from '@/features/admin/categories/CategoryForm';

export function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, loading, error } = useAdminCategories();

  const category = id ? categories.find((c) => c.id === Number(id)) : undefined;
  const isEditing = id !== undefined;

  return (
    <Container className="py-10">
      <h1 className="text-2xl">{isEditing ? 'Editar categoria' : 'Nova categoria'}</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}

      {!loading && !error && isEditing && !category && (
        <p className="mt-6 text-sm text-danger-500">Categoria não encontrada.</p>
      )}

      {!loading && !error && (!isEditing || category) && (
        <Card className="mt-6 max-w-xl p-6">
          <CategoryForm
            category={category}
            categories={categories}
            onSaved={() => navigate('/admin/categorias')}
            onCancel={() => navigate('/admin/categorias')}
          />
        </Card>
      )}
    </Container>
  );
}
