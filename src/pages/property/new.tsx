import React, { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Dropzone from 'react-dropzone'
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome'
import { faPlus, faCopy } from '@fortawesome/free-solid-svg-icons'
import api from '../../services/api'
import { useAlert } from '../../contexts/alert'
import { useLoading } from '../../contexts/loading'
import {
  Header,
  Input,
  InputArea,
  InputSelect,
  StepProgress
} from '../../components'
import states from '../../constants/states'
import types from '../../constants/types'
import inputValidation from '../../utils/inputValidation'
import zipcodeApi from '../../services/zipcodeApi'
import housingPredictorApi from '../../services/housingPredictorApi'

type AddressType = {
  street: string
  number: string
  neighborhood: string
  city: string
  country: string
  state: string
  zipcode: string
  latitude?: string
  longitude?: string
}

type PopertyCardProps = {
  id?: number
  title: string
  description: string
  type: string
  price: string
  bedrooms: string
  bathrooms: string
  area: string
  place: string
  animal: string
  garage: string
  address?: AddressType
}

type ZipcodeResponseProps = {
  erro: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

type GeolocationProps = {
  latitude: string
  longitude: string
}

type HousingPredictorRequestProps = {
  data: string[][]
}

type HousingPredictorResponseProps = {
  data: {
    prediction: [string]
  }
}

const NewAdvertise: React.FC = () => {
  const alert = useAlert()
  const { startLoading, stopLoading } = useLoading()
  const router = useRouter()
  const [data, setData] = useState({
    title: '',
    description: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    place: '',
    garage: '',
    animal: 'true',
    type: 'Casa',
    images: [],
    street: '',
    neighborhood: '',
    number: '',
    city: '',
    state: 'MG',
    country: 'Brasil',
    zipcode: '',
    latitude: '',
    longitude: ''
  })
  const [estimatedPrice, setEstimatedPrice] = useState('')

  function onChange(type: string, value: string) {
    setData({ ...data, [type]: value })
  }

  function onChangeImages(images) {
    images = images.map(image => {
      const newImage = image
      newImage.preview = URL.createObjectURL(image)
      return image
    })
    setData({
      ...data,
      images: [...data.images, ...images]
    })
  }

  async function addImages(propertyId: number) {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }

    const formData = new FormData()

    data.images.forEach(image => {
      formData.append('files', image)
    })

    startLoading()

    await api
      .post(`/property/${propertyId}/images`, formData, config)
      .catch(err => {
        const type = err.response.status >= 500 ? 'error' : 'warning'
        const title = 'Algo deu errado :('
        const message = err.response?.data.description
        alert.show(type, title, message)
        if (process.env.NODE_ENV !== 'production') {
          console.log(err)
        }
      })

    stopLoading()

    router.push('/property')
  }

  async function onSubmit() {
    const propertyData: PopertyCardProps = {
      title: data.title,
      description: data.description,
      price: data.price,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      area: data.area,
      place: data.place,
      garage: data.garage,
      animal: data.animal,
      type: data.type,
      address: {
        street: data.street,
        neighborhood: data.neighborhood,
        number: data.number,
        city: data.city,
        state: data.state,
        country: data.country,
        zipcode: data.zipcode,
        latitude: data.latitude,
        longitude: data.longitude
      }
    }

    startLoading()

    await api
      .post('/property', propertyData)
      .then(res => {
        if (data.images.length > 0) {
          addImages(res.data.id)
        } else {
          router.push('/property')
        }
      })
      .catch(err => {
        const type = err.response.status >= 500 ? 'error' : 'warning'
        const title = 'Algo deu errado :('
        const message = err.response?.data.description
        alert.show(type, title, message)
        if (process.env.NODE_ENV !== 'production') {
          console.log(err)
        }
      })

    stopLoading()
  }

  const searchZipcode = async (zipcode: string) => {
    const zipcodeNumber = zipcode.replace(/\D/g, '')

    const validZipCode = /^[0-9]{8}$/

    if (validZipCode.test(zipcodeNumber)) {
      startLoading()

      await zipcodeApi
        .get<ZipcodeResponseProps>(`/${zipcodeNumber}/json`)
        .then(res => {
          if (res.data.erro) {
            const type = 'warning'
            const title = 'Algo deu errado :('
            const message = 'O CEP fornecido é inválido.'
            alert.show(type, title, message)
          }

          setData({
            ...data,
            zipcode: zipcode,
            street: res.data.logradouro,
            neighborhood: res.data.bairro,
            city: res.data.localidade,
            state: res.data.uf
          })
        })
        .catch(err => {
          console.error(err)

          const type = err.response.status >= 500 ? 'error' : 'warning'
          const title = 'Algo deu errado :('
          const message = err.response?.data.description
          alert.show(type, title, message)
          if (process.env.NODE_ENV !== 'production') {
            console.log(err)
          }
        })

      stopLoading()
    }
  }

  const getGeolocationByAddress = async () => {
    const { street, number, neighborhood, city, state, zipcode } = data

    const config = {
      params: {
        street,
        number,
        neighborhood,
        city,
        state,
        zipcode
      }
    }

    startLoading()

    await api
      .get<GeolocationProps>('/external/geolocation', config)
      .then(res => {
        setData({
          ...data,
          latitude: res.data.latitude,
          longitude: res.data.longitude
        })
      })
      .catch(err => {
        console.error(err)
      })

    stopLoading()
  }

  const getEstimatedPropertyPrice = async () => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }

    const features = [
      data.type,
      data.area,
      data.bedrooms,
      data.bathrooms,
      data.garage,
      data.latitude,
      data.longitude
    ]

    const requestData = {
      data: [features]
    }

    startLoading()

    await housingPredictorApi
      .post<HousingPredictorRequestProps, HousingPredictorResponseProps>(
        '/predict',
        requestData,
        config
      )
      .then(res => {
        setEstimatedPrice(res.data.prediction[0])
      })
      .catch(err => {
        console.error(err)
      })

    stopLoading()
  }

  const copyEstimatedPrice = () => {
    const formatedPrice = parseFloat(estimatedPrice).toFixed(2)
    setData({
      ...data,
      price: inputValidation.currency(formatedPrice.toString())
    })
  }

  function step1() {
    return (
      <div className="step-1">
        <h2>
          Primeiramente, nos diga as informações que você gostaria de conter no
          seu anúncio
        </h2>

        <Input
          type="text"
          label="Título"
          placeholder="Título do anuncio..."
          value={data.title}
          onChange={e => onChange('title', e.target.value)}
        />

        <InputArea
          label="Descrição"
          placeholder="Descrição do anuncio..."
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
        />
      </div>
    )
  }

  function step2() {
    return (
      <div className="step-2">
        <h2>Onde seu imóvel está localizado?</h2>

        <Input
          type="text"
          label="CEP"
          placeholder="CEP do imóvel..."
          value={data.zipcode}
          onChange={e =>
            onChange('zipcode', inputValidation.formatZipcode(e.target.value))
          }
          onBlur={e => searchZipcode(e.target.value)}
        />

        <Input
          type="text"
          label="Rua"
          placeholder="Rua do imóvel..."
          value={data.street}
          onChange={e => onChange('street', e.target.value)}
        />

        <Input
          type="text"
          label="Bairro"
          placeholder="Bairro do imóvel..."
          value={data.neighborhood}
          onChange={e => onChange('neighborhood', e.target.value)}
        />

        <Input
          type="text"
          label="Número"
          placeholder="Número do imóvel..."
          value={data.number}
          onChange={e => onChange('number', e.target.value)}
        />

        <Input
          type="text"
          label="Cidade"
          placeholder="Cidade do imóvel..."
          value={data.city}
          onChange={e => onChange('city', e.target.value)}
        />

        <InputSelect
          type="text"
          label="Estado"
          placeholder="Estado do imóvel..."
          value={data.state}
          options={states}
          onChangeOption={option => onChange('state', option.value)}
        />
      </div>
    )
  }

  function step3() {
    return (
      <div className="step-3">
        <h2> Precisamos de mais algumas informações do seu imóvel</h2>

        <InputSelect
          type="text"
          label="Tipo"
          placeholder="Tipo de imóvel..."
          value={data.type}
          options={types}
          onChangeOption={option => onChange('type', option.value)}
        />

        <Input
          type="text"
          label="Quartos"
          placeholder="Quantidade de quartos..."
          value={data.bedrooms}
          onChange={e => onChange('bedrooms', e.target.value)}
        />

        <Input
          type="text"
          label="Banheiro"
          placeholder="Quantidade de banheiros..."
          value={data.bathrooms}
          onChange={e => onChange('bathrooms', e.target.value)}
        />

        <Input
          type="text"
          label="Área m²"
          placeholder="Área do imóvel..."
          value={data.area}
          onChange={e => onChange('area', e.target.value)}
        />

        <Input
          type="text"
          label="Vagas"
          placeholder="É um imóvel para quantas pessoas?"
          value={data.place}
          onChange={e => onChange('place', e.target.value)}
        />

        <Input
          type="text"
          label="Vagas na garagem"
          placeholder="Possui garagem? Se sim, quantas vagas?"
          value={data.garage}
          onChange={e => onChange('garage', e.target.value)}
        />

        <InputSelect
          type="text"
          label="Animal"
          placeholder="Seu imóvel aceita animais?"
          value={data.animal}
          options={[
            {
              label: 'Sim',
              value: 'true'
            },
            {
              label: 'Não',
              value: 'false'
            }
          ]}
          onChangeOption={option => onChange('animal', option.value)}
        />
      </div>
    )
  }

  function step4() {
    return (
      <div className="step-4">
        <h2>
          Selecione algumas imagens do seu imóvel para deixa-lo mais
          apresentável
        </h2>

        <div className="images">
          {data.images.map((image, key) => {
            return (
              <img
                key={key}
                className="image-item"
                src={image.preview}
                alt="Imagem do imóvel"
              />
            )
          })}
          <Dropzone onDrop={acceptedFiles => onChangeImages(acceptedFiles)}>
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <div className="image-item upload-container">
                  <Icon id="icon" icon={faPlus} />
                </div>
              </div>
            )}
          </Dropzone>
        </div>
      </div>
    )
  }

  function step5() {
    return (
      <div className="step-5">
        <h2>Vamos definir um preço para seu imóvel</h2>

        <Input
          type="text"
          label="Preço"
          labelInside="R$"
          placeholder="1000,00"
          value={data.price}
          maxLength={13}
          onChange={e =>
            onChange('price', inputValidation.currency(e.target.value))
          }
        />

        {estimatedPrice && (
          <div className="estimated-price-container">
            <h2>
              Calculamos um preço estimado para seu imóvel com base nas
              caracteristicas informadas
            </h2>
            <div className="estimated-price-copy">
              <p>
                {inputValidation.formatCurrency(parseFloat(estimatedPrice))}
              </p>
              <button onClick={() => copyEstimatedPrice()}>
                <Icon id="icon" icon={faCopy} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Cadastrar - Vamos cadastrar sua conta Locus</title>
      </Head>

      <main className="new-advertise-page">
        <Header goBack />

        <div className="new-advertise">
          <h1>É rápido, simples e gratuito!</h1>

          <StepProgress
            steps={[
              {
                content: step1
              },
              {
                content: step2,
                onNext: () => getGeolocationByAddress()
              },
              {
                content: step3,
                onNext: () => getEstimatedPropertyPrice()
              },
              {
                content: step4
              },
              {
                content: step5
              }
            ]}
            initialStep={0}
            onSubmit={onSubmit}
          />
        </div>
      </main>
    </div>
  )
}

export default NewAdvertise
