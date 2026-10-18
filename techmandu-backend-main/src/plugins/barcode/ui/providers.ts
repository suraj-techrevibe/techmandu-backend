import { ActionBarContext, addActionBarItem, addNavMenuItem, ModalService, registerFormInputComponent } from '@vendure/admin-ui/core';
import { VariantSerialCodeControlComponent } from './components/barcode-ui';
import { ScanProductDialogComponent } from './components/scan-product.dialog';

export default [
registerFormInputComponent(
  'variant-serial-code-control',
  VariantSerialCodeControlComponent
),

addActionBarItem({
  id: 'scan-barcode-to-order',
  locationId: 'draft-order-detail',
  label: 'Scan barcode',
  icon: 'plus',
  buttonColor: 'primary',
  buttonStyle: 'solid',
  onClick: (event: MouseEvent, context) => {
    const modalService = context.injector.get(ModalService);
    const orderId = context.route.snapshot.params.id as string;

    modalService
      .fromComponent(ScanProductDialogComponent, {
        locals: {
          orderId,
        },
      })
      .subscribe((result: any) => {
        if (result?.added) {
          // context.notificationService.success('Product added to order');

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });
  },
})



];
