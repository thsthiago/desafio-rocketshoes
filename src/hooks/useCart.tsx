import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productLocal = cart.find(product => product.id === productId)

      if (!!productLocal) {
        const { data: productStock } = await api.get(`/stock/${productId}`)

        if(productStock?.amount < productLocal.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }

        setCart(state => {
          const filteredProducts = state.map(productCart => {
            if(productCart.id === productId) {
              return {
                ...productCart,
                amount: productCart.amount + 1
              }
            }

            
            return productCart
          })
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredProducts))
          return filteredProducts
        })

        return
      }

      const { data } = await api.get(`/products/${productId}`)

      const productData = {
        ...data,
        amount: 1
      }

      setCart(state => [...state, productData])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([ ...cart, productData]))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(product => product.id === productId)) {
        throw new Error()
      }

      const products = cart.filter(product => product.id !== productId)
      setCart(products)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products))  
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return

      const { data: productStock } = await api.get(`/stock/${productId}`)

      if(productStock?.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const products = cart.map(productCart => {
        if(productCart.id === productId) {
          return {
            ...productCart,
            amount
          }
        }

        return productCart
      })

      setCart(products)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
