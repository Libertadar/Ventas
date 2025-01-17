class Producto {
  constructor(codigo, costo, margen, stock) {
    this.codigo = codigo;
    this.costo = parseFloat(costo);
    this.margen = parseFloat(margen);
    this.stock = parseInt(stock);
  }

  getPrecioVenta() {
    return this.costo * (1 + this.margen / 100);
  }
}

class SistemaGestion {
  constructor() {
    this.productos = new Map();
    this.movimientos = [];
    this.initEventListeners();
    this.cargarDatos();
  }

  initEventListeners() {
    document.getElementById('productoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.agregarProducto();
    });

    document.getElementById('movimientoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.registrarMovimiento();
    });
  }

  cargarDatos() {
    const productosGuardados = localStorage.getItem('productos');
    const movimientosGuardados = localStorage.getItem('movimientos');

    if (productosGuardados) {
      const productosArray = JSON.parse(productosGuardados);
      productosArray.forEach(([codigo, prod]) => {
        this.productos.set(codigo, new Producto(prod.codigo, prod.costo, prod.margen, prod.stock));
      });
    }

    if (movimientosGuardados) {
      this.movimientos = JSON.parse(movimientosGuardados);
    }

    this.actualizarVistas();
  }

  guardarDatos() {
    localStorage.setItem('productos', JSON.stringify([...this.productos]));
    localStorage.setItem('movimientos', JSON.stringify(this.movimientos));
  }

  agregarProducto() {
    const codigo = document.getElementById('codigo').value;
    const costo = document.getElementById('costo').value;
    const margen = document.getElementById('margen').value;
    const stock = document.getElementById('stock').value;

    if (this.productos.has(codigo)) {
      alert('Ya existe un producto con ese código');
      return;
    }

    const producto = new Producto(codigo, costo, margen, stock);
    this.productos.set(codigo, producto);
    
    document.getElementById('productoForm').reset();
    this.guardarDatos();
    this.actualizarVistas();
  }

  registrarMovimiento() {
    const codigo = document.getElementById('productoSelect').value;
    const tipo = document.getElementById('tipoMovimiento').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const producto = this.productos.get(codigo);

    if (tipo === 'venta' && cantidad > producto.stock) {
      alert('No hay suficiente stock para realizar la venta');
      return;
    }

    producto.stock += tipo === 'compra' ? cantidad : -cantidad;
    
    this.movimientos.push({
      fecha: new Date().toLocaleString(),
      producto: producto.codigo,
      tipo: tipo,
      cantidad: cantidad,
      precioUnitario: tipo === 'compra' ? producto.costo : producto.getPrecioVenta()
    });

    document.getElementById('movimientoForm').reset();
    this.guardarDatos();
    this.actualizarVistas();
  }

  actualizarVistas() {
    this.actualizarTablaInventario();
    this.actualizarTablaMovimientos();
    this.actualizarSelectProductos();
    this.actualizarBalance();
  }

  actualizarTablaInventario() {
    const tabla = document.getElementById('inventarioTabla');
    tabla.innerHTML = '';

    this.productos.forEach(producto => {
      const row = tabla.insertRow();
      row.innerHTML = `
        <td>${producto.codigo}</td>
        <td>$${producto.costo.toFixed(2)}</td>
        <td>$${producto.getPrecioVenta().toFixed(2)}</td>
        <td>${producto.stock}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="sistema.eliminarProducto('${producto.codigo}')">
            Eliminar
          </button>
        </td>
      `;
    });
  }

  actualizarTablaMovimientos() {
    const tabla = document.getElementById('movimientosTabla');
    tabla.innerHTML = '';

    [...this.movimientos].reverse().forEach(mov => {
      const row = tabla.insertRow();
      row.innerHTML = `
        <td>${mov.fecha}</td>
        <td>${mov.producto}</td>
        <td>${mov.tipo}</td>
        <td>${mov.cantidad}</td>
      `;
    });
  }

  actualizarSelectProductos() {
    const select = document.getElementById('productoSelect');
    select.innerHTML = '';

    this.productos.forEach(producto => {
      const option = document.createElement('option');
      option.value = producto.codigo;
      option.textContent = `${producto.codigo} (Stock: ${producto.stock})`;
      select.appendChild(option);
    });
  }

  actualizarBalance() {
    let totalGastos = 0;
    let totalVentas = 0;

    this.movimientos.forEach(mov => {
      const monto = mov.cantidad * mov.precioUnitario;
      if (mov.tipo === 'compra') {
        totalGastos += monto;
      } else {
        totalVentas += monto;
      }
    });

    const saldoNeto = totalVentas - totalGastos;

    document.getElementById('totalGastos').textContent = `$${totalGastos.toFixed(2)}`;
    document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
    
    const saldoNetoElement = document.getElementById('saldoNeto');
    saldoNetoElement.textContent = `$${saldoNeto.toFixed(2)}`;
    saldoNetoElement.className = saldoNeto >= 0 ? 'text-success' : 'text-danger';

    this.actualizarGraficoVentas();
  }

  actualizarGraficoVentas() {
    const ventasPorProducto = new Map();
    
    // Inicializar contador de ventas para cada producto
    this.productos.forEach(producto => {
      ventasPorProducto.set(producto.codigo, 0);
    });

    // Contar ventas por producto
    this.movimientos.forEach(mov => {
      if (mov.tipo === 'venta') {
        ventasPorProducto.set(mov.producto, ventasPorProducto.get(mov.producto) + mov.cantidad);
      }
    });

    // Convertir a arrays y ordenar por cantidad de ventas
    const ventasOrdenadas = [...ventasPorProducto.entries()]
      .sort((a, b) => b[1] - a[1]);

    const ctx = document.getElementById('ventasChart').getContext('2d');
    
    // Destruir el gráfico anterior si existe
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ventasOrdenadas.map(([codigo]) => codigo),
        datasets: [{
          label: 'Unidades Vendidas',
          data: ventasOrdenadas.map(([, cantidad]) => cantidad),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Productos Ordenados por Cantidad de Ventas'
          }
        }
      }
    });
  }

  eliminarProducto(codigo) {
    if (confirm('¿Está seguro de eliminar este producto?')) {
      this.productos.delete(codigo);
      this.guardarDatos();
      this.actualizarVistas();
    }
  }
}

// Inicializar el sistema
const sistema = new SistemaGestion();