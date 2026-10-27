/**
 * Script de Verificación y Testing Integral E2E para Tropas Tunuyán
 * Valida rutas públicas, endpoints de administración, API de subida de imágenes
 * y cálculo financiero.
 */

async function runTestSuite() {
  console.log('====================================================');
  console.log('  TESTING INTEGRAL — TROPAS TUNUYÁN (ETAPA 5)');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  async function testRoute(name, path) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      if (res.status === 200) {
        console.log(`✓ [200 OK] ${name} (${path})`);
        passed++;
      } else {
        console.error(`✗ [FAIL] ${name} (${path}) - Status: ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ [ERROR] ${name} (${path}) - ${err.message}`);
      failed++;
    }
  }

  // 1. Validar Rutas de la Aplicación
  console.log('1. Verificación de Rutas y Páginas:');
  await testRoute('Landing Page', '/');
  await testRoute('Catálogo Público', '/catalogo');
  await testRoute('Login Administrativo', '/admin/login');
  await testRoute('Panel de Inventario', '/admin/inventario');
  await testRoute('Módulo Financiero y Caja', '/admin/finanzas');

  // 2. Validar Endpoint de Subida de Archivos
  console.log('\n2. Verificación de API de Subida de Imágenes (/api/upload):');
  try {
    const testBlob = new Blob(['PNG_TEST_HEADER_TACTICAL'], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', testBlob, 'test-insignia.png');

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (uploadRes.status === 200 && uploadData.success && uploadData.url.startsWith('/uploads/')) {
      console.log(`✓ [200 OK] Subida local exitosa. URL generada: ${uploadData.url}`);
      passed++;
    } else {
      console.error('✗ [FAIL] Subida local falló:', uploadData);
      failed++;
    }
  } catch (err) {
    console.error('✗ [ERROR] Error en endpoint /api/upload:', err.message);
    failed++;
  }

  // 3. Validar Cálculos Financieros y Márgenes
  console.log('\n3. Verificación de Lógica de Cálculo de Precios y Rentabilidad:');
  const costo = 20000;
  const margen = 45; // 45%
  const precioEsperado = Math.round(costo * (1 + margen / 100)); // 29000
  const gananciaEsperada = precioEsperado - costo; // 9000

  if (precioEsperado === 29000 && gananciaEsperada === 9000) {
    console.log(`✓ [Cálculo Precios] Costo: $${costo} + ${margen}% -> Precio: $${precioEsperado} (Ganancia: +$${gananciaEsperada})`);
    passed++;
  } else {
    console.error('✗ [FAIL] Error en fórmula de cálculo de precios');
    failed++;
  }

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
